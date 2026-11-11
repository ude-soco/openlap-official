/* Fixed MongoDB 4.4 shell program. Never print server errors, URIs or documents. */
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
    function connection() {
        var database = env("OPENLAP_MONGODB_DB");
        require(/^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(database));
        require(["admin", "config", "local"].indexOf(database) === -1);
        var uri = env("MONGODB_PRIMARY_URI");
        var sourceHost = env("CHECKPOINT_SOURCE_HOST");
        require(/^[a-z0-9][a-z0-9.-]{0,252}$/.test(sourceHost));
        var port = env("CHECKPOINT_SOURCE_PORT");
        require(/^[1-9][0-9]{0,4}$/.test(port) && Number(port) <= 65535);
        require(uri.length <= 8192 && !/[\x00-\x20\x7f]/.test(uri));
        // One explicit source only. SRV, replica discovery, sockets and URI fragments are unsupported.
        var match = /^mongodb:\/\/([^/?#]+)\/([A-Za-z][A-Za-z0-9_-]{0,62})(?:\?([^#]*))?$/.exec(uri);
        require(match && match[2] === database);
        var authority = match[1].split("@");
        require(authority.length <= 2);
        if (authority.length === 2) {
            require(/^[A-Za-z0-9._~!$&'()*+,;=:%-]+:[A-Za-z0-9._~!$&'()*+,;=:%-]+$/.test(authority[0]));
            require(!/%(?![a-fA-F0-9]{2})/.test(authority[0]));
        }
        require(authority[authority.length - 1] === sourceHost + ":" + port);
        require(sourceHost !== "localhost" && sourceHost !== "127.0.0.1" && sourceHost !== "0.0.0.0");
        var seen = {};
        if (match[3]) { match[3].split("&").forEach(function(option) {
            var pair = option.split("=");
            require(pair.length === 2 && !Object.prototype.hasOwnProperty.call(seen, pair[0]));
            var allowed = {authSource: /^[A-Za-z][A-Za-z0-9_-]{0,62}$/, authMechanism: /^SCRAM-SHA-(1|256)$/,
                           tls: /^true$/, directConnection: /^true$/, readPreference: /^primary$/,
                           serverSelectionTimeoutMS: /^[1-9][0-9]{0,3}$/, connectTimeoutMS: /^[1-9][0-9]{0,3}$/, socketTimeoutMS: /^[1-9][0-9]{0,4}$/};
            require(Object.prototype.hasOwnProperty.call(allowed, pair[0]) && allowed[pair[0]].test(pair[1]));
            seen[pair[0]] = pair[1];
        }); }
        var additions = [];
        if (!seen.directConnection) { additions.push("directConnection=true"); }
        if (!seen.readPreference) { additions.push("readPreference=primary"); }
        if (!seen.serverSelectionTimeoutMS) { additions.push("serverSelectionTimeoutMS=5000"); }
        if (!seen.connectTimeoutMS) { additions.push("connectTimeoutMS=5000"); }
        if (!seen.socketTimeoutMS) { additions.push("socketTimeoutMS=30000"); }
        if (additions.length) { uri += (match[3] ? "&" : "?") + additions.join("&"); }
        var work = env("CHECKPOINT_WORK");
        require(/^\/tmp\/openlap-checkpoint\.[A-Za-z0-9]{8}$/.test(work));
        // JSON is valid YAML. Tools read the secret from this private temporary file, never argv.
        if (env("CHECKPOINT_PHASE") === "source-before") {
            writeFile(work + "/source-config.json", JSON.stringify({uri: uri}) + "\n");
        }
        return {mongo: new Mongo(uri), database: database};
    }
    function snapshot() {
        var local = ["restored", "rehearsal-restored"].indexOf(env("CHECKPOINT_PHASE")) !== -1;
        var selected = local ? {mongo: isolatedConnection(), database: env("OPENLAP_MONGODB_DB")} : connection();
        var db = selected.mongo.getDB(selected.database);
        if (env("CHECKPOINT_PHASE") === "rehearsal-restored") {
            var databases = selected.mongo.getDB("admin").runCommand({listDatabases: 1, nameOnly: true, maxTimeMS: 5000});
            require(databases.ok === 1 && Array.isArray(databases.databases));
            require(databases.databases.every(function(item) {
                return [selected.database, "admin", "config", "local"].indexOf(item.name) !== -1;
            }));
        }
        var hello = selected.mongo.getDB("admin").runCommand({isMaster: 1, maxTimeMS: 5000});
        require(hello.ok === 1 && hello.ismaster === true && hello.msg !== "isdbgrid");
        var build = selected.mongo.getDB("admin").runCommand({buildInfo: 1, maxTimeMS: 5000});
        require(build.ok === 1 && /^4\.4\.[0-9]+$/.test(build.version));
        var fcv = selected.mongo.getDB("admin").runCommand({getParameter: 1, featureCompatibilityVersion: 1, maxTimeMS: 5000});
        require(fcv.ok === 1 && fcv.featureCompatibilityVersion.version === "4.4");
        require(!fcv.featureCompatibilityVersion.targetVersion);
        var infos = commandRows(db, {listCollections: 1, cursor: {batchSize: 64}, maxTimeMS: 30000}, 256);
        require(infos.length > 0 && infos.length <= 256);
        infos.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        var names = [];
        infos.forEach(function(info) {
            require(info.type === "collection" && !info.options.capped);
            require(/^[A-Za-z][A-Za-z0-9_.-]{0,119}$/.test(info.name));
            require(!/^(system\.|tmp\.)/.test(info.name) && info.name.indexOf("$" ) === -1);
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
        print(JSON.stringify({schemaVersion: 1, database: selected.database, serverVersion: build.version,
                              fcv: "4.4", sourceIdentityMd5: hex_md5(bounded(identities)), collections: rows}));
    }
    function finish() {
        var work = env("CHECKPOINT_WORK");
        var before = read(work + "/source-before.json"), after = read(work + "/source-after.json"), restored = read(work + "/restored.json");
        require(JSON.stringify(before) === JSON.stringify(after));
        require(before.database === restored.database && restored.fcv === before.fcv);
        require(JSON.stringify(before.collections) === JSON.stringify(restored.collections));
        var sha = env("CHECKPOINT_ARCHIVE_SHA256"), size = env("CHECKPOINT_ARCHIVE_SIZE"), expanded = env("CHECKPOINT_EXPANDED_SIZE");
        require(/^[a-f0-9]{64}$/.test(sha) && /^[1-9][0-9]*$/.test(size) && /^[1-9][0-9]*$/.test(expanded));
        print(JSON.stringify({schemaVersion: 1, status: "DUMP_AND_ISOLATED_RESTORE_VERIFIED",
            checkpointId: env("CHECKPOINT_ID"), freezeEvidenceId: env("CHECKPOINT_FREEZE_EVIDENCE"),
            freezeVerification: "External operator prerequisite; not enforced or proven by this tool",
            database: before.database, sourceServerVersion: before.serverVersion, restoreServerVersion: restored.serverVersion,
            fcv: before.fcv, databaseToolsVersion: "100.10.0", archiveFile: "database.archive.gz",
            archiveSha256: sha, archiveSizeBytes: Number(size), expandedArchiveBytes: Number(expanded),
            gzipValidated: true, sourceBeforeAfterMatched: true, restoredMatched: true,
            sourceIdentityMd5: before.sourceIdentityMd5, collections: before.collections,
            scope: "One primary database; no S3 objects, external writers, off-node copy or application acceptance verified"}));
    }
    function keys(value, expected) {
        require(value !== null && typeof value === "object" && !Array.isArray(value));
        require(JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected.slice().sort()));
    }
    function integer(value, minimum, maximum) {
        require(typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= minimum && value <= maximum);
    }
    function collectionRows(rows) {
        require(Array.isArray(rows) && rows.length > 0 && rows.length <= 256);
        var previous = "";
        return rows.map(function(row) {
            keys(row, ["name", "count", "identityMd5", "dataMd5", "optionsMd5", "indexesMd5"]);
            require(typeof row.name === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,119}$/.test(row.name));
            require(!/^(system\.|tmp\.)/.test(row.name) && row.name > previous);
            previous = row.name;
            integer(row.count, 0, 1000000);
            [row.identityMd5, row.dataMd5, row.optionsMd5, row.indexesMd5].forEach(requireDigest);
            return {name: row.name, count: row.count, identityMd5: row.identityMd5,
                    dataMd5: row.dataMd5, optionsMd5: row.optionsMd5, indexesMd5: row.indexesMd5};
        });
    }
    function originalReport() {
        var report = read(env("CHECKPOINT_WORK") + "/original-report.json");
        keys(report, ["schemaVersion", "status", "checkpointId", "freezeEvidenceId", "freezeVerification", "database",
            "sourceServerVersion", "restoreServerVersion", "fcv", "databaseToolsVersion", "archiveFile", "archiveSha256",
            "archiveSizeBytes", "expandedArchiveBytes", "gzipValidated", "sourceBeforeAfterMatched", "restoredMatched",
            "sourceIdentityMd5", "collections", "scope"]);
        require(report.schemaVersion === 1 && report.status === "DUMP_AND_ISOLATED_RESTORE_VERIFIED");
        require(typeof report.checkpointId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(report.checkpointId));
        require(typeof report.freezeEvidenceId === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(report.freezeEvidenceId));
        require(report.freezeVerification === "External operator prerequisite; not enforced or proven by this tool");
        require(typeof report.database === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(report.database));
        require(["admin", "config", "local"].indexOf(report.database) === -1);
        require(typeof report.sourceServerVersion === "string" && /^4\.4\.[0-9]{1,3}$/.test(report.sourceServerVersion));
        require(report.restoreServerVersion === "4.4.30" && report.fcv === "4.4" && report.databaseToolsVersion === "100.10.0");
        require(report.archiveFile === "database.archive.gz" && typeof report.archiveSha256 === "string" && /^[a-f0-9]{64}$/.test(report.archiveSha256));
        integer(report.archiveSizeBytes, 1, 1073741824);
        integer(report.expandedArchiveBytes, 1, 1073741824);
        require(report.gzipValidated === true && report.sourceBeforeAfterMatched === true && report.restoredMatched === true);
        requireDigest(report.sourceIdentityMd5);
        require(report.scope === "One primary database; no S3 objects, external writers, off-node copy or application acceptance verified");
        report.collections = collectionRows(report.collections);
        return report;
    }
    function rehearsalResult() {
        var original = originalReport(), restored = read(env("CHECKPOINT_WORK") + "/restored.json");
        require(original.database === restored.database && original.fcv === restored.fcv && restored.serverVersion === "4.4.30");
        require(JSON.stringify(original.collections) === JSON.stringify(collectionRows(restored.collections)));
        require(env("CHECKPOINT_ARCHIVE_SHA256") === original.archiveSha256);
        require(env("CHECKPOINT_ARCHIVE_SIZE") === String(original.archiveSizeBytes));
        require(env("CHECKPOINT_EXPANDED_SIZE") === String(original.expandedArchiveBytes));
        var reportSha = env("CHECKPOINT_EXPECTED_REPORT_SHA256");
        require(/^[a-f0-9]{64}$/.test(reportSha));
        return {schemaVersion: 1, status: "RETRIEVED_ARCHIVE_RESTORE_VERIFIED",
            rehearsalId: env("CHECKPOINT_ID"), originalCheckpointId: original.checkpointId, originalReportSha256: reportSha,
            database: original.database, originalSourceServerVersion: original.sourceServerVersion,
            restoreServerVersion: restored.serverVersion, fcv: restored.fcv, databaseToolsVersion: "100.10.0",
            archiveSha256: original.archiveSha256, archiveSizeBytes: original.archiveSizeBytes,
            expandedArchiveBytes: original.expandedArchiveBytes, gzipValidated: true, restoredMatched: true,
            originalSourceIdentityMd5: original.sourceIdentityMd5, collections: original.collections,
            scope: "Retrieved DB archive only; no live source, new freeze, S3 objects, off-node custody or retention, or application acceptance verified"};
    }
    function rehearsalFinish() { print(JSON.stringify(rehearsalResult())); }
    function artifactIndex() {
        var verified = rehearsalResult(); // Reuse all original-report/archive/collection checks.
        load("/opt/openlap-checkpoint/artifact-index.js");
        print(JSON.stringify(OpenLAPPluginArtifactIndex.project(isolatedConnection().getDB(verified.database),
            originalReport(), env("CHECKPOINT_EXPECTED_REPORT_SHA256"))));
    }
    function artifactSummary() {
        load("/opt/openlap-checkpoint/artifact-index.js");
        var index = read(env("CHECKPOINT_WORK") + "/artifact-index.json");
        print(JSON.stringify(OpenLAPPluginArtifactIndex.summary(index, env("CHECKPOINT_INDEX_SHA256"),
            Number(env("CHECKPOINT_INDEX_SIZE")), env("CHECKPOINT_REHEARSAL_REPORT_SHA256"))));
    }
    try {
        if (env("CHECKPOINT_PHASE") === "local-ready") { isolatedConnection(); print("LOCAL_READY"); }
        else if (env("CHECKPOINT_PHASE") === "finish") { finish(); }
        else if (env("CHECKPOINT_PHASE") === "rehearsal-validate") {
            var original = originalReport();
            print(original.database + " " + original.archiveSha256 + " " + original.archiveSizeBytes + " " + original.expandedArchiveBytes);
        }
        else if (env("CHECKPOINT_PHASE") === "rehearsal-finish") { rehearsalFinish(); }
        else if (env("CHECKPOINT_PHASE") === "rehearsal-plugin-index") { artifactIndex(); }
        else if (env("CHECKPOINT_PHASE") === "rehearsal-plugin-index-summary") { artifactSummary(); }
        else { require(["source-before", "source-after", "restored", "rehearsal-restored"].indexOf(env("CHECKPOINT_PHASE")) !== -1); snapshot(); }
    } catch (_) { print("CHECKPOINT_VALIDATION_FAILED"); quit(1); }
}());
