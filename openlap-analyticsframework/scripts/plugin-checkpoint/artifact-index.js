/* Deterministic projection of a verified isolated restore. No S3 or live connection. */
var OpenLAPPluginArtifactIndex = (function() {
    "use strict";
    var POLICY = "OPENLAP_PLUGIN_ARTIFACT_INDEX_V1";
    var SCOPE = "Verified restored database projection only; known code-owned plugin associations, no universal freeform-ID analysis, S3 object bytes, writer freeze, or application recovery verified";
    var CATALOG = ["analytics-technique", "visualization-library", "visualization-type"];
    var EXECUTABLE = ["analytics-indicator", "analytics-indicator-drafts", "openlap-isc", "plugin-installation"];
    var COLLECTIONS = ["analytics-indicator", "analytics-indicator-drafts", "analytics-technique", "openlap-isc",
        "plugin-artifact", "plugin-installation", "plugin-management-lock", "plugin-removal",
        "plugin-version-family", "visualization-library", "visualization-type"];
    var JSON_FIELDS = ["session", "configurationRequest", "requirements", "dataset", "visRef", "lockedStep"];
    var MAX_ROWS = 10000, MAX_NODES = 1000000, MAX_METADATA = 1048576;
    function require(value) { if (!value) throw new Error("plugin artifact index validation"); }
    function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function map() { return Object.create(null); }
    function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
    function document(value) {
        if (!object(value)) return false;
        var prototype = Object.getPrototypeOf(value);
        // Mongo's native BSON document prototype differs from Object.prototype,
        // but retains the Object constructor. Own "constructor" fields are data.
        return prototype === null || prototype.constructor === Object;
    }
    function optional(value) { return value === null || typeof value === "undefined"; }
    function id(value) {
        if (typeof ObjectId === "function" && value instanceof ObjectId) value = value.str;
        require(typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(value));
        return value;
    }
    function number(value, minimum, maximum) {
        if (value && typeof value.toNumber === "function") value = value.toNumber();
        require(typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= minimum && value <= maximum);
        return value;
    }
    function ref(value, collection, extended) {
        require(object(value) && typeof value.$ref === "string" && own(value, "$id"));
        require(!collection || value.$ref === collection);
        var target = value.$id;
        if (extended && document(target) && Object.keys(target).length === 1 && own(target, "$oid")) {
            require(typeof target.$oid === "string" && /^[a-f0-9]{24}$/.test(target.$oid)); target = target.$oid;
        }
        return {collection: value.$ref, id: id(target)};
    }
    function prefix(kind) { require(kind === "ANALYTICS" || kind === "VISUALIZATION"); return kind === "ANALYTICS" ? "analytics" : "visualizations"; }
    function artifactId(value) { value = id(value); require(/^(analytics|visualizations)-[a-f0-9]{64}$/.test(value)); return value; }
    function noPins(row) { require(optional(row.referencePins) || (document(row.referencePins) && Object.keys(row.referencePins).length === 0)); }
    function sorted(values) { return values.sort(function(a, b) { var x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; }); }
    function kindCollection(kind) {
        require(["ANALYTICS_METHOD", "VISUALIZATION_LIBRARY", "VISUALIZATION_TYPE"].indexOf(kind) !== -1);
        return kind === "ANALYTICS_METHOD" ? CATALOG[0] : kind === "VISUALIZATION_LIBRARY" ? CATALOG[1] : CATALOG[2];
    }
    function binding(original, sha) {
        require(typeof sha === "string" && /^[a-f0-9]{64}$/.test(sha));
        return {originalCheckpointReportSha256: sha, archiveSha256: original.archiveSha256,
            checkpointId: original.checkpointId, database: original.database, sourceIdentityMd5: original.sourceIdentityMd5,
            sourceServerVersion: original.sourceServerVersion, restoreServerVersion: original.restoreServerVersion,
            fcv: original.fcv, databaseToolsVersion: original.databaseToolsVersion};
    }
    function project(db, original, reportSha) {
        function localRef(value, collection, extended) {
            require(object(value) && (optional(value.$db) || value.$db === original.database));
            return ref(value, collection, extended);
        }
        var rows = map(), byId = map(), evidence = [], totalRows = 0, totalBytes = 0, reportCollections = map();
        original.collections.forEach(function(row) { reportCollections[row.name] = row; });
        COLLECTIONS.forEach(function(name) {
            rows[name] = []; byId[name] = map();
            var recorded = reportCollections[name], present = !!recorded;
            var proof = {name: name, present: present, count: present ? recorded.count : 0,
                identityMd5: present ? recorded.identityMd5 : null, dataMd5: present ? recorded.dataMd5 : null,
                optionsMd5: present ? recorded.optionsMd5 : null, indexesMd5: present ? recorded.indexesMd5 : null};
            if (present) {
                require(recorded.count <= MAX_ROWS);
                var cursor = db.getCollection(name).find({}).sort({_id: 1}).maxTimeMS(30000);
                while (cursor.hasNext()) {
                    var row = cursor.next(), bytes = Object.bsonsize(row), key = id(row._id);
                    require(bytes > 0 && bytes <= MAX_METADATA && ++totalRows <= 20000);
                    totalBytes += bytes; require(totalBytes <= 33554432);
                    require(!own(byId[name], key)); byId[name][key] = row; rows[name].push(row);
                    require(rows[name].length <= MAX_ROWS);
                }
                require(rows[name].length === recorded.count);
            }
            evidence.push(proof);
        });
        require(rows["plugin-management-lock"].length === 0);
        var artifacts = [], artifactMap = map(), associations = [], associationKeys = map(), issues = [], issueKeys = map(), legacy = [];
        function issue(collection, source, code, targetCollection, target) {
            var value = {sourceCollection: collection, sourceId: id(source), code: code,
                targetCollection: targetCollection, targetId: id(target)};
            var key = JSON.stringify(value); if (!issueKeys[key]) { issueKeys[key] = true; issues.push(value); }
            require(issues.length <= 10000);
        }
        function edge(collection, source, relation, targetCollection, target, typed, ready) {
            target = id(target);
            var resolved = own(byId[targetCollection], target);
            var value = {sourceCollection: collection, sourceId: id(source), relation: relation,
                targetCollection: targetCollection, targetId: target, typed: typed, resolved: resolved, requiresReady: ready};
            var key = JSON.stringify(value); if (!associationKeys[key]) { associationKeys[key] = true; associations.push(value); }
            require(associations.length <= 10000);
            if (ready && resolved && targetCollection === "plugin-artifact" && artifactMap[target].state !== "READY")
                issue(collection, source, "ARTIFACT_NOT_READY", targetCollection, target);
            return resolved;
        }
        rows["plugin-artifact"].forEach(function(row) {
            noPins(row);
            var key = artifactId(row._id), kindPrefix = prefix(row.kind);
            require(typeof row.sha256 === "string" && /^[a-f0-9]{64}$/.test(row.sha256));
            require(key === kindPrefix + "-" + row.sha256 && row.objectKey === "plugins/" + kindPrefix + "/" + row.sha256 + ".jar");
            require(["READY", "STAGED", "PURGED"].indexOf(row.state) !== -1); // PURGING is an unfinished destructive operation.
            var value = {artifactId: key, kind: row.kind, sha256: row.sha256,
                sizeBytes: number(row.sizeBytes, 1, 104857600), objectKey: row.objectKey, state: row.state,
                presenceRequirement: row.state === "READY" ? "REQUIRED" : row.state === "STAGED" ? "OPTIONAL_STAGED" : "MUST_BE_ABSENT"};
            artifactMap[key] = value; artifacts.push(value);
        });
        require(artifacts.length <= 1000);
        artifacts.sort(function(a, b) { return a.artifactId < b.artifactId ? -1 : a.artifactId > b.artifactId ? 1 : 0; });
        rows["plugin-installation"].forEach(function(row) {
            require(["UPLOADED", "INSPECTION_FAILED", "INSPECTED", "ACTIVE", "DISCARDED"].indexOf(row.state) !== -1);
            prefix(row.kind);
            var target = artifactId(row.artifactId), required = ["ACTIVE", "DISCARDED"].indexOf(row.state) === -1;
            if (edge("plugin-installation", row._id, "installation-artifact", "plugin-artifact", target, true, required)) {
                require(artifactMap[target].kind === row.kind);
                if (artifactMap[target].state === "STAGED") issue("plugin-installation", row._id, "INSTALLATION_ARTIFACT_NOT_READY", "plugin-artifact", target);
            }
        });
        rows["plugin-removal"].forEach(function(row) {
            require(["REMOVED", "RESTORED", "CANCELLED"].indexOf(row.state) !== -1);
            kindCollection(row.kind); id(row.catalogId);
            require(Array.isArray(row.rows) && row.rows.length > 0 && row.rows.length <= 200);
        });
        var available = map();
        CATALOG.forEach(function(collection) {
            available[collection] = map();
            rows[collection].forEach(function(row) {
                noPins(row);
                var installed = true, current = true;
                if (!optional(row.installationId)) {
                    var installation = id(row.installationId);
                    installed = own(byId["plugin-installation"], installation) && byId["plugin-installation"][installation].state === "ACTIVE";
                    edge(collection, row._id, "catalog-installation", "plugin-installation", installation, true, false);
                }
                if (!optional(row.removalState)) {
                    require(["REMOVING", "REMOVED", "RESTORED"].indexOf(row.removalState) !== -1);
                    var operationId = id(row.removalOperation), operation = byId["plugin-removal"][operationId];
                    edge(collection, row._id, "catalog-removal", "plugin-removal", operationId, true, false);
                    current = !!operation && ((row.removalState === "RESTORED" && operation.state === "RESTORED")
                        || (row.removalState === "REMOVING" && operation.state === "CANCELLED"));
                    if (row.removalState === "REMOVED") require(!operation || operation.state === "REMOVED");
                    else if (operation && !current) issue(collection, row._id, "CATALOG_REMOVAL_STATE_MISMATCH", "plugin-removal", operationId);
                }
                available[collection][id(row._id)] = installed && current;
            });
        });
        function catalogArtifact(collection, row) {
            if (collection === "visualization-type") {
                var parent = localRef(row.visualizationLib, "visualization-library"), library = byId[parent.collection][parent.id];
                return library && !optional(library.artifactId) ? artifactId(library.artifactId) : null;
            }
            return optional(row.artifactId) ? null : artifactId(row.artifactId);
        }
        function requireCatalog(collection, source, targetCollection, target) {
            var row = byId[targetCollection][target];
            if (!row) return;
            if (!available[targetCollection][target]) issue(collection, source, "CATALOG_NOT_AVAILABLE", targetCollection, target);
            var artifact = catalogArtifact(targetCollection, row);
            if (artifact && (!artifactMap[artifact] || artifactMap[artifact].state !== "READY"))
                issue(collection, source, "EXECUTABLE_ARTIFACT_NOT_READY", "plugin-artifact", artifact);
        }
        function history(collection, source, relation, target, targetCollection) {
            target = id(target);
            if (/^(analytics|visualizations)-[a-f0-9]{64}$/.test(target))
            {
                edge(collection, source, relation, "plugin-artifact", target, true, false);
                if (artifactMap[target] && artifactMap[target].kind !== (targetCollection === "analytics-technique" ? "ANALYTICS" : "VISUALIZATION"))
                    issue(collection, source, "HISTORY_ARTIFACT_KIND_MISMATCH", "plugin-artifact", target);
            }
            else edge(collection, source, relation, targetCollection, target, true, false);
        }
        CATALOG.forEach(function(collection) {
            rows[collection].forEach(function(row) {
                var key = id(row._id), active = available[collection][key];
                if (collection === "visualization-type") {
                    var parent = localRef(row.visualizationLib, "visualization-library");
                    edge(collection, key, "chart-parent-library", parent.collection, parent.id, true, active);
                    if (active) requireCatalog(collection, key, parent.collection, parent.id);
                } else if (optional(row.artifactId)) legacy.push({collection: collection, catalogId: key, available: active});
                else {
                    var ownArtifact = artifactId(row.artifactId);
                    edge(collection, key, "catalog-artifact", "plugin-artifact", ownArtifact, true, active);
                    if (artifactMap[ownArtifact] && artifactMap[ownArtifact].kind !== (collection === "analytics-technique" ? "ANALYTICS" : "VISUALIZATION"))
                        issue(collection, key, "CATALOG_ARTIFACT_KIND_MISMATCH", "plugin-artifact", ownArtifact);
                }
                if (!optional(row.previousId)) edge(collection, key, "previous-catalog-version", collection, id(row.previousId), true, false);
                if (!optional(row.pluginFamilyId)) history(collection, key, "catalog-family", row.pluginFamilyId,
                    collection === "visualization-type" ? "visualization-library" : collection);
                if (collection === "visualization-library" && !optional(row.visualizationTypes)) {
                    require(Array.isArray(row.visualizationTypes) && row.visualizationTypes.length <= 1000);
                    row.visualizationTypes.forEach(function(value) {
                        var target = localRef(value, "visualization-type");
                        edge(collection, key, "library-chart-type", target.collection, target.id, true, active);
                    });
                }
            });
        });
        function plan(operation, value, relation) {
            if (optional(value)) return;
            require(document(value));
            var collection = operation.kind === "ANALYTICS" ? "analytics-technique" : "visualization-library";
            var entries = operation.kind === "ANALYTICS" ? "analytics-technique" : "visualization-type";
            if (!optional(value.previousArtifactId)) edge("plugin-installation", operation._id, relation + "-artifact", "plugin-artifact", artifactId(value.previousArtifactId), true, false);
            if (!optional(value.familyId)) history("plugin-installation", operation._id, relation + "-family", value.familyId, collection);
            if (!optional(value.targetId)) edge("plugin-installation", operation._id, relation + "-target", collection, id(value.targetId), true, false);
            if (!optional(value.entries)) {
                require(Array.isArray(value.entries) && value.entries.length <= 128);
                value.entries.forEach(function(entry) { require(document(entry)); edge("plugin-installation", operation._id, relation + "-entry", entries, id(entry.id), true, false); });
            }
            if (!optional(value.library)) { require(document(value.library)); edge("plugin-installation", operation._id, relation + "-library", "visualization-library", id(value.library.id), true, false); }
            if (!optional(value.mappings)) {
                require(document(value.mappings));
                Object.keys(value.mappings).forEach(function(key) { edge("plugin-installation", operation._id, relation + "-mapping", entries, id(key), true, false); });
            }
        }
        rows["plugin-installation"].forEach(function(row) { plan(row, row.replacementTarget, "replacement-target"); plan(row, row.replacement, "replacement"); });
        rows["plugin-removal"].forEach(function(row) {
            edge("plugin-removal", row._id, "removal-catalog", kindCollection(row.kind), id(row.catalogId), true, false);
            row.rows.forEach(function(snapshot) {
                require(document(snapshot) && CATALOG.indexOf(snapshot._collection) !== -1);
                edge("plugin-removal", row._id, "removal-snapshot", snapshot._collection, id(snapshot._id), true, false);
                if (!optional(snapshot.artifactId)) edge("plugin-removal", row._id, "removal-snapshot-artifact", "plugin-artifact", artifactId(snapshot.artifactId), true, false);
                if (snapshot._collection === "visualization-type") {
                    var parent = localRef(snapshot.visualizationLib, "visualization-library");
                    edge("plugin-removal", row._id, "removal-snapshot-library", parent.collection, parent.id, true, false);
                }
            });
        });
        rows["plugin-version-family"].forEach(function(row) {
            var value = id(row._id), separator = value.indexOf(":"), kind = value.substring(0, separator);
            require(separator > 0 && kind !== "VISUALIZATION_TYPE"); number(row.ordinal, 0, 2147483647);
            history("plugin-version-family", value, "version-family", value.substring(separator + 1), kindCollection(kind));
        });
        var wanted = map();
        CATALOG.forEach(function(collection) { Object.keys(byId[collection]).forEach(function(key) {
            if (!wanted[key]) wanted[key] = []; wanted[key].push(collection);
        }); });
        var nodes = 0;
        function found(value, collection, source, executable) {
            if (!wanted[value]) return;
            wanted[value].forEach(function(targetCollection) {
                edge(collection, source, "known-catalog-id", targetCollection, value, false, executable);
                if (executable) requireCatalog(collection, source, targetCollection, value);
                if (targetCollection === "visualization-type") {
                    var parent = localRef(byId[targetCollection][value].visualizationLib, "visualization-library");
                    edge(collection, source, "known-chart-parent", parent.collection, parent.id, false, executable);
                }
            });
        }
        function parsedJson(text, required) {
            if (text.length > MAX_METADATA) { require(!required); return null; }
            var stack = [], expression = /"(?:[^"\\]|\\.)*"|[{}\[\]]/g, match;
            try {
                while ((match = expression.exec(text)) !== null) {
                    require(++nodes <= MAX_NODES);
                    var token = match[0];
                    if (token.charAt(0) === '"') {
                        var key = JSON.parse(token), next = expression.lastIndex;
                        while (next < text.length && /\s/.test(text.charAt(next))) next++;
                        if (text.charAt(next) === ":" && stack.length && stack[stack.length - 1].object) {
                            var keys = stack[stack.length - 1].keys; require(!own(keys, key)); keys[key] = true;
                        }
                    } else if (token === "{" || token === "[") { stack.push({object: token === "{", keys: map()}); require(stack.length <= 48); }
                    else { require(stack.length > 0); stack.pop(); }
                }
                return {value: JSON.parse(text)};
            } catch (error) { require(!required); return null; }
        }
        function walk(value, field, depth, collection, source, executable, jsonMode) {
            require(depth <= 48 && ++nodes <= MAX_NODES);
            if (optional(value)) return;
            if (object(value) && typeof value.$ref === "string" && own(value, "$id")) {
                if (CATALOG.indexOf(value.$ref) !== -1 || value.$ref === "analytics-indicator") {
                    var reference = localRef(value, null, jsonMode);
                    edge(collection, source, "typed-dbref", reference.collection, reference.id, true, executable);
                    if (executable && CATALOG.indexOf(reference.collection) !== -1) requireCatalog(collection, source, reference.collection, reference.id);
                }
                return;
            }
            if (typeof ObjectId === "function" && value instanceof ObjectId) { found(id(value), collection, source, executable); return; }
            if (Array.isArray(value)) value.forEach(function(child) { walk(child, field, depth + 1, collection, source, executable, jsonMode); });
            else if (object(value)) Object.keys(value).forEach(function(key) {
                if (jsonMode || ["_id", "createdBy", "_pluginReferenceWrite"].indexOf(key) === -1)
                    walk(value[key], key, depth + 1, collection, source, executable, jsonMode);
            });
            else if (typeof value === "string") {
                found(value, collection, source, executable);
                var trimmed = value.replace(/^\s+|\s+$/g, ""), required = JSON_FIELDS.indexOf(field) !== -1;
                if (required && trimmed === "null") return;
                if (trimmed && (required || trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[")) {
                    var parsed = parsedJson(value, required);
                    if (parsed) walk(parsed.value, null, depth + 1, collection, source, executable, true);
                }
            }
        }
        EXECUTABLE.forEach(function(collection) { rows[collection].forEach(function(row) {
            var checked = row;
            if (collection === "plugin-installation" && object(row.replacementTarget) && row.replacementTarget.removed === true) {
                checked = {}; Object.keys(row).forEach(function(key) { if (key !== "replacement" && key !== "replacementTarget") checked[key] = row[key]; });
            }
            walk(checked, null, 0, collection, id(row._id), collection !== "plugin-installation", false);
        }); });
        require(nodes <= MAX_NODES);
        sorted(associations); sorted(legacy); sorted(issues);
        var dangling = associations.filter(function(value) { return value.typed && !value.resolved; }).length;
        var resolved = dangling === 0 && issues.length === 0;
        var summary = {artifactCount: artifacts.length, requiredObjectCount: artifacts.filter(function(a) { return a.state === "READY"; }).length,
            optionalStagedCount: artifacts.filter(function(a) { return a.state === "STAGED"; }).length,
            purgedCount: artifacts.filter(function(a) { return a.state === "PURGED"; }).length,
            catalogEntryCount: CATALOG.reduce(function(n, name) { return n + rows[name].length; }, 0),
            installationCount: rows["plugin-installation"].length, removalCount: rows["plugin-removal"].length,
            familyCount: rows["plugin-version-family"].length, knownAssociationCount: associations.length,
            danglingTypedReferenceCount: dangling, legacyCatalogEntryCount: legacy.length, associationIssueCount: issues.length};
        var index = {schemaVersion: 1, projectionPolicy: POLICY, status: "CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED",
            binding: binding(original, reportSha), collections: evidence, artifacts: artifacts, associations: associations,
            legacyCatalogEntries: legacy, associationIssues: issues, summary: summary,
            associationsResolved: resolved, readyForS3Export: resolved && legacy.length === 0,
            emptyRegisteredPluginSnapshot: summary.artifactCount + summary.catalogEntryCount + summary.installationCount
                + summary.removalCount + summary.familyCount + summary.knownAssociationCount === 0,
            objectBytesVerified: false, s3RestoreVerified: false, scope: SCOPE};
        require(JSON.stringify(index).length <= MAX_METADATA);
        return index;
    }
    function summary(index, sha, size, rehearsalSha) {
        require(index.schemaVersion === 1 && index.projectionPolicy === POLICY && index.status === "CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED");
        [sha, rehearsalSha, index.binding.originalCheckpointReportSha256, index.binding.archiveSha256].forEach(function(value) { require(typeof value === "string" && /^[a-f0-9]{64}$/.test(value)); });
        number(size, 1, MAX_METADATA);
        var fields = ["artifactCount", "requiredObjectCount", "optionalStagedCount", "purgedCount", "catalogEntryCount",
            "installationCount", "removalCount", "familyCount", "knownAssociationCount", "danglingTypedReferenceCount",
            "legacyCatalogEntryCount", "associationIssueCount"], counts = {};
        require(document(index.summary) && JSON.stringify(Object.keys(index.summary).sort()) === JSON.stringify(fields.slice().sort()));
        fields.forEach(function(name) { counts[name] = number(index.summary[name], 0, 20000); });
        [index.associationsResolved, index.readyForS3Export, index.emptyRegisteredPluginSnapshot].forEach(function(value) { require(typeof value === "boolean"); });
        return {schemaVersion: 1, status: index.status, projectionPolicy: POLICY,
            originalCheckpointReportSha256: index.binding.originalCheckpointReportSha256, archiveSha256: index.binding.archiveSha256,
            artifactIndexSha256: sha, artifactIndexSizeBytes: size, rehearsalReportSha256: rehearsalSha,
            counts: counts, associationsResolved: index.associationsResolved, readyForS3Export: index.readyForS3Export,
            emptyRegisteredPluginSnapshot: index.emptyRegisteredPluginSnapshot, objectBytesVerified: false, s3RestoreVerified: false};
    }
    return {project: project, summary: summary};
}());
