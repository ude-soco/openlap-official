/* Strict schema fixtures. No native process, connection or application records. */
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const source = fs.readFileSync(path.join(__dirname, "../analyticsframework/scripts/plugin-checkpoint/online-report.js"), "utf8");
const row = {name: "users", count: 0, identityMd5: "a".repeat(32), dataMd5: "b".repeat(32), optionsMd5: "c".repeat(32), indexesMd5: "d".repeat(32)};
const report = {
    schemaVersion: 2, status: "INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED", captureMode: "INSTANCE_WIDE_OPLOG", checkpointId: "synthetic-online", database: "fixture",
    sourceServerVersion: "4.4.29", restoreServerVersion: "4.4.30", fcv: "4.4", databaseToolsVersion: "100.10.0", archiveFile: "database.archive.gz",
    archiveSha256: "a".repeat(64), archiveSizeBytes: 100, expandedArchiveBytes: 200, gzipValidated: true, oplogReplayVerified: true,
    sourceMetadataMatched: true, sourceIdentityMd5: "e".repeat(32), sourceReplicaSet: {name: "fixture-rs", identityMd5: "f".repeat(32)},
    sourceOplogBefore: {seconds: 1794400000, increment: 1}, sourceOplogAfter: {seconds: 1794400001, increment: 0},
    captureStartedAt: "2026-11-11T12:00:00.000Z", captureCompletedAt: "2026-11-11T12:00:01.000Z",
    oplogRangeValidation: "NATIVE_MONGODUMP_COMPLETE_RANGE", fingerprintAuthority: "ISOLATED_FULL_OPLOG_REPLAY",
    databases: [{name: "fixture", collections: [row]}], collections: [row],
    scope: "Full dump eligible source instance excluding local; selected application projection only; no separate MongoDB instance, S3 bytes, freeze, off-node custody or application acceptance verified"
};
function validate(value) {
    const output = []; let rejected = false;
    try {
        vm.runInNewContext(source, {
            _getEnv: name => ({CHECKPOINT_WORK: "/synthetic", CHECKPOINT_PHASE: "rehearsal-validate"})[name] || "",
            cat: () => JSON.stringify(value), print: text => output.push(text), quit: () => { throw new Error("rejected"); }
        }, {timeout: 1000});
    } catch (error) { rejected = true; }
    return !rejected && output.length === 1 && output[0] === "fixture " + "a".repeat(64) + " 100 200";
}
assert(validate(report));
let passed = 1;
for (const mutate of [
    v => { v.freezeEvidenceId = "invented-freeze"; }, v => { v.sourceBeforeAfterMatched = true; },
    v => { v.schemaVersion = 1; }, v => { v.checkpointId = 123; }, v => { v.sourceReplicaSet.name = 123; },
    v => { v.captureMode = "FROZEN"; }, v => { v.oplogReplayVerified = false; },
    v => { v.captureStartedAt = "2026-11-11T12:00:02.000Z"; }, v => { v.captureStartedAt = "2026-02-30T12:00:00.000Z"; },
    v => { v.captureStartedAt = "2026-11-11T12:00:00Z"; }, v => { v.captureStartedAt = "2026-11-11T13:00:00.000+01:00"; },
    v => { v.sourceOplogBefore.increment = 4294967296; }, v => { v.sourceOplogAfter.seconds = 1794399999; },
    v => { v.sourceOplogBefore.seconds = -1; }, v => { v.sourceOplogBefore.seconds = 1.5; },
    v => { v.databases.push(v.databases[0]); }, v => { v.databases[0].name = "local"; },
    v => { v.databases[0].collections[0].count = 1; }, v => { v.collections[0].count = true; },
    v => { v.collections[0].name = "system.users"; v.databases[0].collections[0].name = "system.users"; },
    v => { v.databases[0].collections[0].name = "tmp.collection"; }, v => { v.databases[0].collections[0].extra = true; },
    v => { v.databases[0].extra = true; }, v => { v.archiveSizeBytes = 0; },
    v => { v.archiveSizeBytes = 1073741825; }, v => { v.archiveSha256 = "A".repeat(64); },
    v => { v.restoreServerVersion = "4.4.29"; }, v => { v.scope += "; universal recovery"; }
]) {
    const value = JSON.parse(JSON.stringify(report)); mutate(value); assert(!validate(value)); passed++;
}
const full = JSON.parse(JSON.stringify(report));
full.databases.unshift({name: "admin", collections: [{...row, name: "system.version"}]});
assert(validate(full)); passed++;
console.log("PASS: " + passed + " strict online report schema fixtures");
