/* Full-instance online oplog report; bounded metadata only, no source document output. */
(function() {
    "use strict";
    function require(value) { if (!value) { throw new Error("checkpoint validation"); } }
    function env(name) { return _getEnv(name) || ""; }
    function json(value) { return tojsononeline(value); }
    function topSorted(value) {
        var result = {};
        Object.keys(value).sort().forEach(function(key) { result[key] = value[key]; });
        return result; // Nested BSON order, including literal documents, stays significant.
    }
    function read(path) { return JSON.parse(cat(path)); }
    function requireDigest(value) { require(typeof value === "string" && /^[a-f0-9]{32}$/.test(value)); }
    function bounded(value) { var text = json(value); require(text.length <= 1048576); return text; }
    function commandRows(db, command, maximum) {
        var result = db.runCommand(command), rows = [], metadataBytes = 0;
        require(result.ok === 1 && result.cursor);
        for (;;) {
            var batch = result.cursor.firstBatch || result.cursor.nextBatch;
            require(Array.isArray(batch) && rows.length + batch.length <= maximum);
            batch.forEach(function(row) {
                var bytes = Object.bsonsize(row);
                require(bytes > 0 && bytes <= 1048576);
                metadataBytes += bytes;
                require(metadataBytes <= 4194304);
            });
            rows = rows.concat(batch);
            if (result.cursor.id.toNumber() === 0) { return rows; }
            require(result.cursor.ns.indexOf(db.getName() + ".") === 0);
            // MongoDB 4.4 inherits the originating cursor deadline; explicit getMore
            // maxTimeMS is rejected for these non-awaitData metadata cursors.
            result = db.runCommand({getMore: result.cursor.id,
                collection: result.cursor.ns.substring(db.getName().length + 1), batchSize: 64});
            require(result.ok === 1 && result.cursor);
        }
    }
    function isolatedConnection() {
        var mongo = new Mongo("mongodb://127.0.0.1:37017/?directConnection=true&serverSelectionTimeoutMS=2000&connectTimeoutMS=2000&socketTimeoutMS=30000");
        var options = mongo.getDB("admin").runCommand({getCmdLineOpts: 1, maxTimeMS: 2000});
        require(options.ok === 1 && options.parsed.storage.dbPath === env("CHECKPOINT_WORK") + "/db");
        require(options.parsed.net.bindIp === "127.0.0.1" && options.parsed.net.port === 37017);
        require(options.parsed.net.unixDomainSocket.enabled === false);
        return mongo;
    }
    function databaseSnapshot(mongo, database) {
        var db = mongo.getDB(database);
        var infos = commandRows(db, {listCollections: 1, cursor: {batchSize: 64}, maxTimeMS: 30000}, 256);
        require(infos.length > 0 && infos.length <= 256);
        infos.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        var names = [];
        infos.forEach(function(info) {
            require(info.type === "collection" && !info.options.capped);
            require(/^[A-Za-z][A-Za-z0-9_.-]{0,119}$/.test(info.name));
            require(!/^tmp\./.test(info.name) && info.name.indexOf("$") === -1);
            require(["admin", "config"].indexOf(database) !== -1 || !/^system\./.test(info.name));
            names.push(info.name);
        });
        var hashes = db.runCommand({dbHash: 1, collections: names, maxTimeMS: 60000});
        require(hashes.ok === 1 && hashes.capped.length === 0);
        require(JSON.stringify(Object.keys(hashes.collections).sort()) === JSON.stringify(names.slice().sort()));
        var rows = [];
        infos.forEach(function(info) {
            var collection = db.getCollection(info.name);
            var indexes = commandRows(db, {listIndexes: info.name, includeBuildUUIDs: true,
                cursor: {batchSize: 64}, maxTimeMS: 30000}, 64);
            require(indexes.length > 0 && indexes.length <= 64);
            require(indexes.some(function(index) { return index.name === "_id_" && json(index.key) === json({_id: 1}); }));
            indexes.forEach(function(index) { require(!index.buildUUID && !index.spec); });
            indexes.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
            var indexMetadata = indexes.map(function(index) {
                var clean = {};
                Object.keys(index).sort().forEach(function(key) { if (key !== "ns") { clean[key] = index[key]; } });
                return clean; // Preserve key document order and every other index option.
            });
            var count = 0, idChars = 0, idDigest = hex_md5("OPENLAP-ID-CHAIN-V1");
            var cursor = collection.find({}, {_id: 1}).sort({_id: 1}).maxTimeMS(60000);
            while (cursor.hasNext()) {
                var identifier = json(cursor.next());
                require(identifier.length <= 16384);
                idChars += identifier.length; count++;
                require(count <= 1000000 && idChars <= 134217728);
                idDigest = hex_md5(idDigest + ":" + identifier.length + ":" + identifier);
            }
            requireDigest(hashes.collections[info.name]);
            rows.push({name: info.name, count: count, identityMd5: idDigest,
                       dataMd5: hashes.collections[info.name],
                       optionsMd5: hex_md5(bounded(topSorted(info.options))),
                       indexesMd5: hex_md5(bounded(indexMetadata))});
        });
        var identities = infos.map(function(info) { require(info.info && info.info.uuid); return {name: info.name, uuid: info.info.uuid}; });
        return {name: database, collections: rows};
    }
    var SCOPE = "Full dump eligible source instance excluding local; selected application projection only; no separate MongoDB instance, S3 bytes, freeze, off-node custody or application acceptance verified";
    function keys(value, expected) {
        require(value && typeof value === "object" && !Array.isArray(value));
        require(JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected.slice().sort()));
    }
    function integer(value, minimum, maximum) {
        require(typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= minimum && value <= maximum);
    }
    function sha(value) { require(typeof value === "string" && /^[a-f0-9]{64}$/.test(value)); return value; }
    function identifier(value) { require(typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(value)); return value; }
    function selectedDatabase(value) { identifier(value); require(["admin", "config", "local"].indexOf(value) === -1); return value; }
    function timestamp(value) {
        keys(value, ["seconds", "increment"]); integer(value.seconds, 0, 4294967295); integer(value.increment, 0, 4294967295); return value;
    }
    function utc(value) {
        require(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value));
        require(new Date(value).toISOString() === value); return value;
    }
    function emit(value, limit) { var encoded = JSON.stringify(value); require(encoded.length <= (limit || 262144)); print(encoded); }
    function databaseNames(mongo) {
        var result = mongo.getDB("admin").runCommand({listDatabases: 1, nameOnly: true, maxTimeMS: 5000});
        require(result.ok === 1 && Array.isArray(result.databases));
        var names = result.databases.map(function(row) { return identifier(row.name); }).filter(function(name) { return name !== "local"; }).sort();
        require(names.length > 0 && names.length <= 16 && new Set(names).size === names.length); return names;
    }
    function server(mongo) {
        var hello = mongo.getDB("admin").runCommand({isMaster: 1, maxTimeMS: 5000});
        var build = mongo.getDB("admin").runCommand({buildInfo: 1, maxTimeMS: 5000});
        var fcv = mongo.getDB("admin").runCommand({getParameter: 1, featureCompatibilityVersion: 1, maxTimeMS: 5000});
        require(hello.ok === 1 && hello.ismaster === true && hello.msg !== "isdbgrid" && hello.localTime instanceof Date);
        require(build.ok === 1 && /^4\.4\.[0-9]{1,3}$/.test(build.version));
        require(fcv.ok === 1 && fcv.featureCompatibilityVersion.version === "4.4" && !fcv.featureCompatibilityVersion.targetVersion);
        return {hello: hello, serverVersion: build.version, fcv: "4.4", observedAt: utc(hello.localTime.toISOString())};
    }
    function sourceConnection() {
        var host = env("CHECKPOINT_SOURCE_HOST"), port = env("CHECKPOINT_SOURCE_PORT"), set = env("CHECKPOINT_REPLICA_SET");
        require(/^[a-z0-9][a-z0-9.-]{0,252}$/.test(host) && ["localhost", "127.0.0.1", "0.0.0.0"].indexOf(host) === -1);
        require(/^[1-9][0-9]{0,4}$/.test(port) && Number(port) <= 65535 && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(set));
        var uri = env("MONGODB_PRIMARY_URI"); require(uri.length <= 8192 && !/[\x00-\x20\x7f]/.test(uri));
        // A path database would silently constrain --oplog; only the empty path is accepted.
        var match = /^mongodb:\/\/([^/?#]+)\/(?:\?([^#]*))?$/.exec(uri); require(match);
        var authority = match[1].split("@"); require(authority.length <= 2);
        if (authority.length === 2) {
            require(/^[A-Za-z0-9._~!$&'()*+,;=:%-]+:[A-Za-z0-9._~!$&'()*+,;=:%-]+$/.test(authority[0]));
            require(!/%(?![a-fA-F0-9]{2})/.test(authority[0]));
        }
        require(authority[authority.length - 1] === host + ":" + port);
        var seen = {}, options = [];
        if (match[2]) match[2].split("&").forEach(function(option) {
            var pair = option.split("="); require(pair.length === 2 && !Object.prototype.hasOwnProperty.call(seen, pair[0]));
            var allowed = {authSource: /^[A-Za-z][A-Za-z0-9_-]{0,62}$/, authMechanism: /^SCRAM-SHA-(1|256)$/,
                tls: /^true$/, directConnection: /^true$/, readPreference: /^primary$/, replicaSet: /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/,
                serverSelectionTimeoutMS: /^[1-9][0-9]{0,3}$/, connectTimeoutMS: /^[1-9][0-9]{0,3}$/, socketTimeoutMS: /^[1-9][0-9]{0,4}$/};
            require(Object.prototype.hasOwnProperty.call(allowed, pair[0]) && allowed[pair[0]].test(pair[1]));
            require(pair[0] !== "replicaSet" || pair[1] === set); seen[pair[0]] = true;
        });
        ["directConnection=true", "readPreference=primary", "serverSelectionTimeoutMS=5000", "connectTimeoutMS=5000", "socketTimeoutMS=30000", "replicaSet=" + set].forEach(function(option) {
            if (!seen[option.split("=")[0]]) options.push(option);
        });
        if (options.length) uri += (match[2] ? "&" : "?") + options.join("&");
        if (env("CHECKPOINT_PHASE") === "source-before") writeFile(env("CHECKPOINT_WORK") + "/source-config.json", JSON.stringify({uri: uri}) + "\n");
        return new Mongo(uri);
    }
    function sourceSnapshot() {
        selectedDatabase(env("OPENLAP_MONGODB_DB"));
        var mongo = sourceConnection(), state = server(mongo), hello = state.hello;
        var expected = env("CHECKPOINT_SOURCE_HOST") + ":" + env("CHECKPOINT_SOURCE_PORT");
        require(hello.setName === env("CHECKPOINT_REPLICA_SET") && hello.me === expected && JSON.stringify(hello.hosts) === JSON.stringify([expected]));
        require(!hello.arbiters && !hello.passives);
        var config = mongo.getDB("admin").runCommand({replSetGetConfig: 1, maxTimeMS: 5000});
        require(config.ok === 1 && config.config._id === hello.setName && config.config.members.length === 1);
        require(config.config.members[0].host === expected && !config.config.members[0].arbiterOnly);
        var metadata = [], total = 0, names = databaseNames(mongo);
        require(names.indexOf(env("OPENLAP_MONGODB_DB")) !== -1);
        names.forEach(function(name) {
            var db = mongo.getDB(name), infos = commandRows(db, {listCollections: 1, cursor: {batchSize: 64}, maxTimeMS: 30000}, 256);
            infos.sort(function(a,b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
            infos.forEach(function(info) {
                require(++total <= 512 && info.type === "collection" && !info.options.capped && info.info && info.info.uuid);
                require(/^[A-Za-z][A-Za-z0-9_.-]{0,119}$/.test(info.name) && !/^tmp\./.test(info.name));
                require(["admin", "config"].indexOf(name) !== -1 || !/^system\./.test(info.name));
                // Native full dumps/replay omit most config namespaces. Only
                // recognized server bookkeeping may be omitted; arbitrary data
                // stored there must not silently disappear from a backup.
                if (name === "config") require(["chunks", "collections", "databases", "settings", "shards", "tags", "version",
                    "system.sessions", "transactions"].indexOf(info.name) !== -1);
                var indexes = commandRows(db, {listIndexes: info.name, includeBuildUUIDs: true, cursor: {batchSize: 64}, maxTimeMS: 30000}, 64);
                indexes.forEach(function(index) { require(!index.buildUUID && !index.spec); });
                indexes.sort(function(a,b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
                metadata.push({database: name, name: info.name, uuid: info.info.uuid, options: topSorted(info.options), indexes: indexes});
            });
        });
        var oplog = mongo.getDB("local").getCollection("oplog.rs").find({}, {ts: 1}).sort({$natural: -1}).limit(1).maxTimeMS(5000).next().ts;
        emit({serverVersion: state.serverVersion, fcv: state.fcv, observedAt: state.observedAt,
            sourceIdentityMd5: hex_md5(bounded(metadata)),
            sourceReplicaSet: {name: hello.setName, identityMd5: hex_md5(bounded(config.config))},
            sourceOplog: {seconds: oplog.getTime(), increment: oplog.getInc()}});
    }
    function fullSnapshot() {
        var mongo = isolatedConnection(), state = server(mongo), names = databaseNames(mongo), total = 0;
        var databases = names.map(function(name) { var row = databaseSnapshot(mongo, name); total += row.collections.length; require(total <= 512); return row; });
        emit({serverVersion: state.serverVersion, fcv: state.fcv, databases: databases});
    }
    function collectionRows(rows, system) {
        require(Array.isArray(rows) && rows.length > 0 && rows.length <= 256); var previous = "";
        rows.forEach(function(row) {
            keys(row, ["name", "count", "identityMd5", "dataMd5", "optionsMd5", "indexesMd5"]);
            require(typeof row.name === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,119}$/.test(row.name) && row.name > previous && !/^tmp\./.test(row.name));
            require(system || !/^system\./.test(row.name)); previous = row.name; integer(row.count, 0, 1000000);
            [row.identityMd5, row.dataMd5, row.optionsMd5, row.indexesMd5].forEach(requireDigest);
        }); return rows;
    }
    function databaseRows(rows) {
        require(Array.isArray(rows) && rows.length > 0 && rows.length <= 16); var previous = "", total = 0;
        rows.forEach(function(row) { keys(row, ["name", "collections"]); identifier(row.name);
            require(row.name !== "local" && row.name > previous); previous = row.name;
            collectionRows(row.collections, ["admin", "config"].indexOf(row.name) !== -1); total += row.collections.length; require(total <= 512);
        }); return rows;
    }
    function originalReport() {
        var value = read(env("CHECKPOINT_WORK") + "/original-report.json");
        keys(value, ["schemaVersion", "status", "captureMode", "checkpointId", "database", "sourceServerVersion", "restoreServerVersion", "fcv", "databaseToolsVersion",
            "archiveFile", "archiveSha256", "archiveSizeBytes", "expandedArchiveBytes", "gzipValidated", "oplogReplayVerified", "sourceMetadataMatched", "sourceIdentityMd5",
            "sourceReplicaSet", "sourceOplogBefore", "sourceOplogAfter", "captureStartedAt", "captureCompletedAt", "oplogRangeValidation", "fingerprintAuthority", "databases", "collections", "scope"]);
        require(value.schemaVersion === 2 && value.status === "INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED" && value.captureMode === "INSTANCE_WIDE_OPLOG");
        require(typeof value.checkpointId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value.checkpointId)); selectedDatabase(value.database);
        require(typeof value.sourceServerVersion === "string" && /^4\.4\.[0-9]{1,3}$/.test(value.sourceServerVersion) && value.restoreServerVersion === "4.4.30" && value.fcv === "4.4" && value.databaseToolsVersion === "100.10.0");
        require(value.archiveFile === "database.archive.gz"); sha(value.archiveSha256); integer(value.archiveSizeBytes, 1, 1073741824); integer(value.expandedArchiveBytes, 1, 1073741824);
        require(value.gzipValidated === true && value.oplogReplayVerified === true && value.sourceMetadataMatched === true); requireDigest(value.sourceIdentityMd5);
        keys(value.sourceReplicaSet, ["name", "identityMd5"]); require(typeof value.sourceReplicaSet.name === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value.sourceReplicaSet.name)); requireDigest(value.sourceReplicaSet.identityMd5);
        var first = timestamp(value.sourceOplogBefore), last = timestamp(value.sourceOplogAfter);
        require(first.seconds < last.seconds || (first.seconds === last.seconds && first.increment <= last.increment));
        require(utc(value.captureStartedAt) <= utc(value.captureCompletedAt));
        require(value.oplogRangeValidation === "NATIVE_MONGODUMP_COMPLETE_RANGE" && value.fingerprintAuthority === "ISOLATED_FULL_OPLOG_REPLAY" && value.scope === SCOPE);
        databaseRows(value.databases); collectionRows(value.collections, false);
        var selected = value.databases.filter(function(row) { return row.name === value.database; });
        require(selected.length === 1 && JSON.stringify(selected[0].collections) === JSON.stringify(value.collections)); return value;
    }
    function finish() {
        var work = env("CHECKPOINT_WORK"), before = read(work + "/source-before.json"), after = read(work + "/source-after.json"), restored = read(work + "/restored.json");
        require(before.serverVersion === after.serverVersion && before.fcv === after.fcv && before.sourceIdentityMd5 === after.sourceIdentityMd5);
        require(JSON.stringify(before.sourceReplicaSet) === JSON.stringify(after.sourceReplicaSet));
        require(restored.serverVersion === "4.4.30" && restored.fcv === "4.4"); databaseRows(restored.databases);
        var selected = restored.databases.filter(function(row) { return row.name === env("OPENLAP_MONGODB_DB"); }); require(selected.length === 1);
        var value = {schemaVersion: 2, status: "INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED", captureMode: "INSTANCE_WIDE_OPLOG",
            checkpointId: env("CHECKPOINT_ID"), database: selected[0].name, sourceServerVersion: before.serverVersion, restoreServerVersion: restored.serverVersion,
            fcv: "4.4", databaseToolsVersion: "100.10.0", archiveFile: "database.archive.gz", archiveSha256: sha(env("CHECKPOINT_ARCHIVE_SHA256")),
            archiveSizeBytes: Number(env("CHECKPOINT_ARCHIVE_SIZE")), expandedArchiveBytes: Number(env("CHECKPOINT_EXPANDED_SIZE")),
            gzipValidated: true, oplogReplayVerified: true, sourceMetadataMatched: true, sourceIdentityMd5: before.sourceIdentityMd5,
            sourceReplicaSet: before.sourceReplicaSet, sourceOplogBefore: before.sourceOplog, sourceOplogAfter: after.sourceOplog,
            captureStartedAt: before.observedAt, captureCompletedAt: after.observedAt, oplogRangeValidation: "NATIVE_MONGODUMP_COMPLETE_RANGE",
            fingerprintAuthority: "ISOLATED_FULL_OPLOG_REPLAY", databases: restored.databases, collections: selected[0].collections, scope: SCOPE};
        writeFile(work + "/original-report.json", JSON.stringify(value) + "\n"); originalReport(); emit(value);
    }
    function rehearsalResult() {
        var original = originalReport(), restored = read(env("CHECKPOINT_WORK") + "/restored.json");
        require(restored.serverVersion === "4.4.30" && restored.fcv === "4.4" && JSON.stringify(databaseRows(restored.databases)) === JSON.stringify(original.databases));
        require(env("CHECKPOINT_ARCHIVE_SHA256") === original.archiveSha256 && Number(env("CHECKPOINT_ARCHIVE_SIZE")) === original.archiveSizeBytes && Number(env("CHECKPOINT_EXPANDED_SIZE")) === original.expandedArchiveBytes);
        return {schemaVersion: 2, status: "RETRIEVED_INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED", captureMode: "INSTANCE_WIDE_OPLOG", rehearsalId: env("CHECKPOINT_ID"),
            originalCheckpointId: original.checkpointId, originalReportSha256: sha(env("CHECKPOINT_EXPECTED_REPORT_SHA256")), archiveSha256: original.archiveSha256,
            database: original.database, databases: original.databases, oplogReplayVerified: true, restoredMatched: true,
            scope: "Retrieved full-instance archive replay only; no source connection, S3 objects, off-node custody or application acceptance verified"};
    }
    try {
        var phase = env("CHECKPOINT_PHASE");
        if (phase === "local-ready") { isolatedConnection(); print("LOCAL_READY"); }
        else if (phase === "source-before" || phase === "source-after") sourceSnapshot();
        else if (phase === "restored" || phase === "rehearsal-restored") fullSnapshot();
        else if (phase === "finish") finish();
        else if (phase === "rehearsal-validate") { var original = originalReport(); print(original.database + " " + original.archiveSha256 + " " + original.archiveSizeBytes + " " + original.expandedArchiveBytes); }
        else if (phase === "rehearsal-finish") emit(rehearsalResult());
        else if (phase === "rehearsal-plugin-index") {
            rehearsalResult(); load("/opt/openlap-checkpoint/artifact-index.js");
            emit(OpenLAPPluginArtifactIndex.project(isolatedConnection().getDB(originalReport().database), originalReport(), env("CHECKPOINT_EXPECTED_REPORT_SHA256")), 1048576);
        } else if (phase === "rehearsal-plugin-index-summary") {
            load("/opt/openlap-checkpoint/artifact-index.js"); emit(OpenLAPPluginArtifactIndex.summary(read(env("CHECKPOINT_WORK") + "/artifact-index.json"), env("CHECKPOINT_INDEX_SHA256"), Number(env("CHECKPOINT_INDEX_SIZE")), env("CHECKPOINT_REHEARSAL_REPORT_SHA256")));
        } else require(false);
    } catch (_) { print("ONLINE_CHECKPOINT_VALIDATION_FAILED"); quit(1); }
}());
