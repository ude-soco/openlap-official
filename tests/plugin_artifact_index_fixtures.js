/* Synthetic Mongo-shell unit fixtures. Never connect to a server or print documents. */
load("/opt/openlap-checkpoint/artifact-index.js");
(function() {
    "use strict";
    var passed = 0, SENTINEL = "PRIVATE-FIXTURE-VALUE-MUST-NOT-BE-LOGGED";
    function check(value) { if (!value) throw new Error("artifact index fixture assertion"); }
    function sha(character) { return new Array(65).join(character); }
    function artifact(character, state, kind) {
        kind = kind || "ANALYTICS";
        var prefix = kind === "ANALYTICS" ? "analytics" : "visualizations", digest = sha(character);
        return {_id: prefix + "-" + digest, kind: kind, sha256: digest, objectKey: "plugins/" + prefix + "/" + digest + ".jar",
            sizeBytes: NumberLong(19), state: state || "READY", createdBy: SENTINEL};
    }
    function index(documents) {
        var original = {checkpointId: "synthetic-original", archiveSha256: sha("d"), database: "fixture",
            sourceIdentityMd5: new Array(33).join("e"), sourceServerVersion: "4.4.29", restoreServerVersion: "4.4.30",
            fcv: "4.4", databaseToolsVersion: "100.10.0", collections: []};
        Object.keys(documents).sort().forEach(function(name) {
            original.collections.push({name: name, count: documents[name].length,
                identityMd5: new Array(33).join("a"), dataMd5: new Array(33).join("b"),
                optionsMd5: new Array(33).join("c"), indexesMd5: new Array(33).join("d")});
        });
        var database = {getCollection: function(name) { return {find: function() {
            var values = (documents[name] || []).slice().sort(function(a, b) { return String(a._id) < String(b._id) ? -1 : 1; }), position = 0;
            var cursor = {sort: function() { return cursor; }, maxTimeMS: function() { return cursor; },
                hasNext: function() { return position < values.length; }, next: function() { return values[position++]; }};
            return cursor;
        }}; }};
        var value = OpenLAPPluginArtifactIndex.project(database, original, sha("f"));
        check(JSON.stringify(value).indexOf(SENTINEL) === -1);
        return value;
    }
    function fail(name, fn) {
        var rejected = false;
        try { fn(); } catch (error) { rejected = true; }
        check(rejected); passed++;
    }
    var empty = index({"users": [{_id: "user", password: SENTINEL}], "analytics-indicator": [
        {_id: "unrelated", content: "000000000000000000000009", description: "{freeform incomplete"}]});
    check(empty.emptyRegisteredPluginSnapshot && empty.readyForS3Export && empty.artifacts.length === 0);
    check(empty.collections.filter(function(row) { return row.name === "plugin-artifact"; })[0].present === false); passed++;
    var presentEmpty = index({"plugin-artifact": []});
    check(presentEmpty.emptyRegisteredPluginSnapshot && presentEmpty.collections.filter(function(row) { return row.name === "plugin-artifact"; })[0].present);
    check(JSON.stringify(empty) !== JSON.stringify(presentEmpty)); passed++;
    var all = {"plugin-artifact": [artifact("a"), artifact("b"), artifact("c"), artifact("d"), artifact("e", "STAGED"),
        artifact("f", "PURGED"), artifact("1", "READY", "VISUALIZATION")],
        "analytics-technique": [
            {_id: "current", artifactId: artifact("a")._id, enabled: true, description: SENTINEL},
            {_id: "older", artifactId: artifact("b")._id, enabled: false, previousId: "current", pluginFamilyId: artifact("a")._id},
            {_id: "recoverable", artifactId: artifact("c")._id, removalState: "REMOVED", removalOperation: "removal"},
            {_id: "purged-history", artifactId: artifact("f")._id, removalState: "REMOVED", removalOperation: "purged-removal"}],
        "visualization-library": [{_id: "library", artifactId: artifact("1", "READY", "VISUALIZATION")._id,
            visualizationTypes: [new DBRef("visualization-type", "chart")]}],
        "visualization-type": [{_id: "chart", visualizationLib: new DBRef("visualization-library", "library")}],
        "plugin-installation": [{_id: "discarded", artifactId: artifact("d")._id, kind: "ANALYTICS", state: "DISCARDED"},
            {_id: "retained-active", artifactId: artifact("f")._id, kind: "ANALYTICS", state: "ACTIVE",
                replacementTarget: {removed: true, previousArtifactId: artifact("a")._id, targetId: "current", familyId: artifact("a")._id}}],
        "plugin-removal": [{_id: "removal", kind: "ANALYTICS_METHOD", catalogId: "recoverable", state: "REMOVED",
            rows: [{_collection: "analytics-technique", _id: "recoverable", artifactId: artifact("c")._id}]},
            {_id: "purged-removal", kind: "ANALYTICS_METHOD", catalogId: "purged-history", state: "REMOVED",
            rows: [{_collection: "analytics-technique", _id: "purged-history", artifactId: artifact("f")._id}]}],
        "plugin-version-family": [{_id: "ANALYTICS_METHOD:" + artifact("a")._id, ordinal: NumberLong(2)}],
        "analytics-indicator": [{_id: ObjectId("000000000000000000000001"), createdBy: SENTINEL,
            analyticsTechniqueReference: {analyticsTechnique: new DBRef("analytics-technique", "current")},
            visualizationTechniqueReference: {visLibrary: new DBRef("visualization-library", "library"), visType: new DBRef("visualization-type", "chart")},
            configurationRequest: JSON.stringify({method: "older", arbitrary: "000000000000000000000009"}),
            _pluginReferenceWrite: {token: SENTINEL, pins: [{rawId: "not-a-live-reservation"}]}}]};
    var complete = index(all);
    check(complete.readyForS3Export && complete.associationsResolved && !complete.emptyRegisteredPluginSnapshot);
    check(complete.summary.requiredObjectCount === 5 && complete.summary.optionalStagedCount === 1 && complete.summary.purgedCount === 1);
    check(complete.artifacts.filter(function(row) { return row.artifactId === artifact("c")._id; })[0].presenceRequirement === "REQUIRED");
    check(complete.artifacts.filter(function(row) { return row.artifactId === artifact("f")._id; })[0].presenceRequirement === "MUST_BE_ABSENT");
    check(complete.objectBytesVerified === false && complete.s3RestoreVerified === false); passed++;
    var reversed = {}; Object.keys(all).reverse().forEach(function(key) { reversed[key] = all[key].slice().reverse(); });
    check(JSON.stringify(index(reversed)) === JSON.stringify(complete)); passed++;
    var dangling = index({"analytics-indicator": [{_id: "saved", selected: new DBRef("analytics-technique", "missing")}]});
    check(!dangling.readyForS3Export && !dangling.associationsResolved && !dangling.emptyRegisteredPluginSnapshot);
    check(dangling.summary.danglingTypedReferenceCount === 1); passed++;
    var legacy = index({"analytics-technique": [{_id: ObjectId("000000000000000000000002"), enabled: false}]});
    check(legacy.associationsResolved && !legacy.readyForS3Export && legacy.summary.legacyCatalogEntryCount === 1); passed++;
    var missing = index({"analytics-technique": [{_id: "method", artifactId: artifact("a")._id}]});
    check(!missing.readyForS3Export && missing.summary.danglingTypedReferenceCount === 1); passed++;
    var nonready = index({"plugin-artifact": [artifact("a", "PURGED")], "analytics-technique": [{_id: "method", artifactId: artifact("a")._id}]});
    check(!nonready.readyForS3Export && nonready.summary.associationIssueCount > 0); passed++;
    var jsonRefs = index({"plugin-artifact": [artifact("a")], "analytics-technique": [{_id: "method", artifactId: artifact("a")._id}],
        "analytics-indicator-drafts": [{_id: "draft", session: JSON.stringify({nested: JSON.stringify({method: "method"})})}]});
    check(jsonRefs.readyForS3Export && jsonRefs.summary.knownAssociationCount > 1); passed++;
    var foreign = index({"analytics-indicator": [{_id: "saved", owner: new DBRef("users", "unrelated@email.invalid")}]});
    check(foreign.emptyRegisteredPluginSnapshot); passed++;
    var extended = index({"plugin-artifact": [artifact("a")], "analytics-technique": [{_id: ObjectId("000000000000000000000003"), artifactId: artifact("a")._id}],
        "analytics-indicator-drafts": [{_id: "draft", session: '{"selected":{"$ref":"analytics-technique","$id":{"$oid":"000000000000000000000003"}}}'}]});
    check(extended.readyForS3Export && extended.associations.some(function(row) { return row.typed && row.relation === "typed-dbref" && row.resolved; })); passed++;
    var replacement = index({"plugin-artifact": [artifact("1", "READY", "VISUALIZATION"), artifact("2", "READY", "VISUALIZATION")],
        "visualization-library": [{_id: "library", artifactId: artifact("1", "READY", "VISUALIZATION")._id,
            visualizationTypes: [new DBRef("visualization-type", "chart")]}],
        "visualization-type": [{_id: "chart", visualizationLib: new DBRef("visualization-library", "library")}],
        "plugin-installation": [{_id: "replacement", kind: "VISUALIZATION", state: "INSPECTED", artifactId: artifact("2", "READY", "VISUALIZATION")._id,
            replacementTarget: {kind: "VISUALIZATION_LIBRARY", targetId: "library", familyId: "library",
                previousArtifactId: artifact("1", "READY", "VISUALIZATION")._id, entries: [{id: "chart"}], library: {id: "library"}},
            replacement: {entries: [{id: "chart"}], mappings: {chart: "new-chart-class"}, library: {id: "library"}}}]});
    check(replacement.readyForS3Export && replacement.associations.filter(function(row) { return row.relation === "replacement-target-entry" || row.relation === "replacement-mapping"; })
        .every(function(row) { return row.targetCollection === "visualization-type" && row.targetId === "chart" && row.resolved; })); passed++;
    var fieldNames = {_id: "field-names", kind: "ANALYTICS", state: "INSPECTED", artifactId: artifact("a")._id, replacementTarget: {removed: true}};
    Object.defineProperty(fieldNames, "__proto__", {value: {selected: new DBRef("analytics-technique", "missing")}, enumerable: true});
    var preservedNames = index({"plugin-artifact": [artifact("a")], "plugin-installation": [fieldNames]});
    check(!preservedNames.readyForS3Export && preservedNames.summary.danglingTypedReferenceCount === 1); passed++;
    [129, 200].forEach(function(count) {
        var document = {"plugin-artifact": [artifact("1", "READY", "VISUALIZATION")],
            "visualization-library": [{_id: "large-library", artifactId: artifact("1", "READY", "VISUALIZATION")._id,
                removalState: "REMOVED", removalOperation: "large-removal"}], "visualization-type": [],
            "plugin-removal": [{_id: "large-removal", kind: "VISUALIZATION_LIBRARY", catalogId: "large-library", state: "REMOVED",
                rows: [{_collection: "visualization-library", _id: "large-library", artifactId: artifact("1", "READY", "VISUALIZATION")._id}]}]};
        for (var i = 1; i < count; i++) {
            var chart = {_id: "large-chart-" + i, visualizationLib: new DBRef("visualization-library", "large-library"), removalState: "REMOVED", removalOperation: "large-removal"};
            document["visualization-type"].push(chart);
            document["plugin-removal"][0].rows.push({_collection: "visualization-type", _id: chart._id, visualizationLib: chart.visualizationLib});
        }
        var projected = index(document);
        check(projected.readyForS3Export && projected.summary.catalogEntryCount === count); passed++;
    });
    fail("foreign plugin database", function() { index({"analytics-indicator": [{_id: "saved", selected: {$ref: "analytics-technique", $id: "method", $db: "another_database"}}]}); });
    ["PURGING", "UNRECOGNIZED"].forEach(function(state) { fail("artifact state", function() { index({"plugin-artifact": [artifact("a", state)]}); }); });
    ["INSPECTING", "ACTIVATING", "UNRECOGNIZED"].forEach(function(state) { fail("installation state", function() {
        index({"plugin-installation": [{_id: "operation", artifactId: artifact("a")._id, kind: "ANALYTICS", state: state}]});
    }); });
    ["PREPARING", "COMMITTING", "RESTORING"].forEach(function(state) { fail("removal state", function() {
        index({"plugin-removal": [{_id: "removal", kind: "ANALYTICS_METHOD", catalogId: "method", state: state, rows: [{}]}]});
    }); });
    fail("management lock", function() { index({"plugin-management-lock": [{_id: "lock"}]}); });
    fail("artifact pin", function() { var a = artifact("a"); a.referencePins = {reservation: {sourceCollection: "artifact-upload"}}; index({"plugin-artifact": [a]}); });
    fail("invalid pin shape", function() { var a = artifact("a"); a.referencePins = NumberLong(1); index({"plugin-artifact": [a]}); });
    fail("catalog pin", function() { index({"analytics-technique": [{_id: "method", referencePins: {reservation: {}}}]}); });
    fail("invalid required snapshot", function() { index({"analytics-indicator-drafts": [{_id: "draft", session: "{invalid"}]}); });
    fail("ambiguous required snapshot", function() { index({"analytics-indicator-drafts": [{_id: "draft", session: '{"method":"one","method":"two"}'}]}); });
    fail("artifact key", function() { var a = artifact("a"); a.objectKey = "../outside"; index({"plugin-artifact": [a]}); });
    fail("artifact size", function() { var a = artifact("a"); a.sizeBytes = NumberLong(104857601); index({"plugin-artifact": [a]}); });
    fail("ambiguous catalog identity", function() { index({"analytics-technique": [{_id: "000000000000000000000002"}, {_id: ObjectId("000000000000000000000002")}]}); });
    fail("removal scope over limit", function() { var snapshots=[]; for(var i=0;i<201;i++)snapshots.push({_id:'method-'+i,_collection:'analytics-technique'});
        index({'plugin-removal':[{_id:'large-removal',kind:'ANALYTICS_METHOD',catalogId:'method-0',state:'REMOVED',rows:snapshots}]}); });
    var summary = OpenLAPPluginArtifactIndex.summary(complete, sha("a"), JSON.stringify(complete).length + 1, sha("b"));
    check(summary.counts.artifactCount === complete.artifacts.length && summary.readyForS3Export && JSON.stringify(summary).indexOf(SENTINEL) === -1); passed++;
    print("PASS: " + passed + " synthetic artifact index projection fixtures");
}());
