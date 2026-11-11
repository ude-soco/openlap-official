/* Generated data in a task-owned source MongoDB only. Never print records. */
(function() {
    "use strict";
    var d = db.getSiblingDB("plugin_recovery_fixture"), seed = JSON.parse(cat("/control/objects.json")), versions = {};
    d.users.insertOne({_id: "fixture-operator", fixture: "generated-noncredential-record"});
    d.createCollection("plugin-artifact");
    seed.objects.forEach(function(row) {
        versions[row.label] = row; delete row.label;
        if (row.state !== "ORPHAN") { row.sizeBytes = NumberLong(String(row.sizeBytes)); d["plugin-artifact"].insertOne(row); }
    });
    if (seed.objects.length) {
        d["analytics-technique"].insertMany([
            {_id: "current-method", artifactId: versions.current._id, enabled: true},
            {_id: "older-method", artifactId: versions.older._id, enabled: false, previousId: "current-method", pluginFamilyId: versions.current._id},
            {_id: "purged-method", artifactId: versions.purged._id, removalState: "REMOVED", removalOperation: "purged-operation"}]);
        d["visualization-library"].insertOne({_id: "removed-library", artifactId: versions.removed._id, removalState: "REMOVED",
            removalOperation: "removed-operation", visualizationTypes: [new DBRef("visualization-type", "removed-chart")]});
        d["visualization-type"].insertOne({_id: "removed-chart", visualizationLib: new DBRef("visualization-library", "removed-library"),
            removalState: "REMOVED", removalOperation: "removed-operation"});
        d["plugin-installation"].insertOne({_id: "discarded-installation", kind: "ANALYTICS", state: "DISCARDED", artifactId: versions.discarded._id});
        d["plugin-removal"].insertMany([
            {_id: "removed-operation", kind: "VISUALIZATION_LIBRARY", catalogId: "removed-library", state: "REMOVED", rows: [
                {_collection: "visualization-library", _id: "removed-library", artifactId: versions.removed._id},
                {_collection: "visualization-type", _id: "removed-chart", visualizationLib: new DBRef("visualization-library", "removed-library")}]},
            {_id: "purged-operation", kind: "ANALYTICS_METHOD", catalogId: "purged-method", state: "REMOVED", rows: [
                {_collection: "analytics-technique", _id: "purged-method", artifactId: versions.purged._id}]}]);
        d["plugin-version-family"].insertOne({_id: "ANALYTICS_METHOD:" + versions.current._id, ordinal: NumberLong(2)});
        d["analytics-indicator"].insertOne({_id: ObjectId("000000000000000000000001"),
            analyticsTechniqueReference: {analyticsTechnique: new DBRef("analytics-technique", "current-method")},
            configurationRequest: JSON.stringify({method: "older-method"})});
        d["analytics-indicator-drafts"].insertOne({_id: "draft", session: JSON.stringify({method: "older-method"})});
    }
    print("GENERATED_DATABASE_SEEDED");
}());
