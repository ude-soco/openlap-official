/* Generated two-database transactions in task-owned MongoDB only. */
(function() {
    "use strict";
    var phase = _getEnv("FIXTURE_PHASE"), host = _getEnv("FIXTURE_HOST") || "source-mongo";
    var connection = new Mongo(host + ":27017"), app = connection.getDB("plugin_recovery_fixture"), other = connection.getDB("online_other_fixture");
    if (phase === "seed") {
        app["online-counter"].insertOne({_id: "state", seq: 0, left: 0, right: 0}); other.createCollection("events");
        var payload = new Array(16385).join("p");
        for (var batch = 0; batch < 16; batch++) {
            var rows = []; for (var i = 0; i < 64; i++) rows.push({_id: batch * 64 + i, payload: payload});
            app["online-padding"].insertMany(rows);
        }
        print("GENERATED_ONLINE_DATABASES_SEEDED");
    } else if (phase === "write") {
        var session = connection.startSession({causalConsistency: false});
        app = session.getDatabase("plugin_recovery_fixture"); other = session.getDatabase("online_other_fixture");
        for (var attempt = 0; attempt < 10000; attempt++) {
            if (listFiles("/control").some(function(file) { return file.name === "/control/stop"; })) break;
            session.startTransaction({writeConcern: {w: "majority", j: true}});
            var next = app["online-counter"].findOne({_id: "state"}).seq + 1;
            app["online-counter"].updateOne({_id: "state"}, {$set: {seq: next, left: next, right: -next}});
            other.events.insertOne({_id: next}); session.commitTransaction(); sleep(5);
        }
        session.endSession(); print("GENERATED_ONLINE_WRITER_STOPPED");
    } else if (phase === "state") {
        var reader = null;
        if (connection.getDB("admin").isMaster().setName) {
            reader = connection.startSession({causalConsistency: false}); reader.startTransaction({readConcern: {level: "snapshot"}});
            app = reader.getDatabase("plugin_recovery_fixture"); other = reader.getDatabase("online_other_fixture");
        }
        var state = app["online-counter"].findOne({_id: "state"}), events = other.events.countDocuments({});
        var padding = app["online-padding"].countDocuments({});
        if (!state || state.seq !== state.left || state.seq !== -state.right || state.seq !== events || padding !== 1024) {
            // Only fixed generated fixture counters, never application records.
            function counter(value) { return typeof value === "number" && isFinite(value) && Math.floor(value) === value && Math.abs(value) <= 10000 ? value : null; }
            print(JSON.stringify({status: "GENERATED_TRANSACTION_STATE_REJECTED", statePresent: !!state,
                seq: counter(state && state.seq), left: counter(state && state.left), right: counter(state && state.right),
                events: counter(events), padding: counter(padding)})); quit(1);
        }
        if (reader) { reader.commitTransaction(); reader.endSession(); }
        print(JSON.stringify({committedTransactions: state.seq, crossDatabaseInvariantVerified: true, paddingDocuments: 1024}));
    } else quit(1);
}());
