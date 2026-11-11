/* Pure synthetic validation; no Mongo server, deployment config or credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = path.join(__dirname, '../.k8s/components/plugin-backup-replica-set/replica-set.js');
const rs = require(script);
const env = { OPENLAP_MONGODB_REPLICA_SET: 'example-rs', OPENLAP_MONGODB_REPLICA_HOST: 'example-mongo.example.svc.cluster.local:27017', OPENLAP_MONGODB_OPLOG_SIZE_MIB: '16' };
const expected = rs.settings(env);
const config = { _id: expected.name, version: 1, term: 1, protocolVersion: 1,
  writeConcernMajorityJournalDefault: true,
  members: [{ _id: 0, host: expected.host, priority: 1, votes: 1, arbiterOnly: false,
    hidden: false, buildIndexes: true, slaveDelay: 0, tags: {} }],
  settings: { chainingAllowed: true, heartbeatIntervalMillis: 2000, heartbeatTimeoutSecs: 10,
    electionTimeoutMillis: 10000, catchUpTimeoutMillis: -1, catchUpTakeoverDelayMillis: 30000,
    getLastErrorModes: {}, getLastErrorDefaults: { w: 1, wtimeout: 0 }, replicaSetId: 'synthetic-id' } };
const clone = value => JSON.parse(JSON.stringify(value));
const rejected = (action, code) => assert.throws(action, error => error.exitCode === code);
let cases = 0;
rs.configuration(config, expected); cases++;
const longs = clone(config);
longs.protocolVersion = { toNumber: () => 1 };
longs.members[0].slaveDelay = { toNumber: () => 0 };
rs.configuration(longs, expected); cases++;
const bson = clone(config);
for (const value of [bson, bson.members[0], bson.members[0].tags, bson.settings,
  bson.settings.getLastErrorDefaults, bson.settings.getLastErrorModes]) {
  Object.defineProperty(value, Symbol.toStringTag, { value: 'BSON' });
}
rs.configuration(bson, expected); cases++;
for (const [key, value] of [
  ['OPENLAP_MONGODB_REPLICA_SET', ''], ['OPENLAP_MONGODB_REPLICA_SET', '../other'], ['OPENLAP_MONGODB_REPLICA_SET', 'example-rs\n'],
  ['OPENLAP_MONGODB_REPLICA_HOST', '127.0.0.1:27017'], ['OPENLAP_MONGODB_REPLICA_HOST', 'localhost:27017'],
  ['OPENLAP_MONGODB_REPLICA_HOST', 'localhost.localdomain:27017'], ['OPENLAP_MONGODB_REPLICA_HOST', 'host:27018'],
  ['OPENLAP_MONGODB_REPLICA_HOST', 'user:pass@host:27017'], ['OPENLAP_MONGODB_REPLICA_HOST', 'host..example:27017'],
  ['OPENLAP_MONGODB_REPLICA_HOST', 'host:27017\n'], ['OPENLAP_MONGODB_OPLOG_SIZE_MIB', ''],
  ['OPENLAP_MONGODB_OPLOG_SIZE_MIB', '015'], ['OPENLAP_MONGODB_OPLOG_SIZE_MIB', '15'],
  ['OPENLAP_MONGODB_OPLOG_SIZE_MIB', '1025'], ['OPENLAP_MONGODB_OPLOG_SIZE_MIB', '16\n']]) {
  rejected(() => rs.settings({ ...env, [key]: value }), 10); cases++;
}
for (const mutate of [
  value => { value._id = 'other-rs'; }, value => { value.members[0].host = 'other:27017'; },
  value => { value.members.push(clone(value.members[0])); }, value => { value.members[0].priority = 2; },
  value => { value.members[0].votes = 0; }, value => { value.members[0].hidden = true; },
  value => { value.members[0].arbiterOnly = true; }, value => { value.members[0].tags = { zone: 'custom' }; },
  value => { value.members[0].buildIndexes = false; }, value => { value.members[0].slaveDelay = 1; },
  value => { value.members[0].newlyAdded = true; }, value => { value.configsvr = true; },
  value => { value.writeConcernMajorityJournalDefault = false; }, value => { value.protocolVersion = 0; },
  value => { value.settings.electionTimeoutMillis = 20000; },
  value => { value.settings.getLastErrorDefaults.w = 'majority'; },
  value => { value.settings.getLastErrorDefaults.j = false; },
  value => { value.settings.extra = true; }]) {
  const changed = clone(config); mutate(changed); rejected(() => rs.configuration(changed, expected), 30); cases++;
}
function admin(version = '4.4.30', fcv = '4.4', set = expected.name, size = 16) {
  return { runCommand(command) {
    if (command.buildInfo) return { ok: 1, version };
    if (command.getCmdLineOpts) return { ok: 1, parsed: { replication: { replSetName: set, oplogSizeMB: size } } };
    if (command.getParameter) return { ok: 1, featureCompatibilityVersion: { version: fcv } };
    throw new Error('Unexpected synthetic command');
  } };
}
rs.prerequisites(admin(), expected); cases++;
for (const server of [admin('5.0.0'), admin('4.4.30', '4.2'), admin('4.4.30', '4.4', 'other'), admin('4.4.30', '4.4', expected.name, 32)]) {
  rejected(() => rs.prerequisites(server, expected), 20); cases++;
}
function lifecycle({ existing = true, race = false, unavailable = false, wrongHost = false, mode = 'initialize', storedOplogMiB = 16, freeBytes = 1024 ** 3 } = {}) {
  const calls = []; let attempts = 0, clock = 0, exit;
  const stored = clone(config); if (wrongHost) stored.members[0].host = 'another:27017';
  const database = {
    getSiblingDB: () => database,
    runCommand(command) {
      const operation = Object.keys(command)[0]; calls.push(operation);
      if (operation === 'ping') return { ok: 1 };
      if (['buildInfo', 'getCmdLineOpts', 'getParameter'].includes(operation)) return admin().runCommand(command);
      if (operation === 'replSetGetConfig') return existing ? { ok: 1, config: stored } : { ok: 0, code: 94 };
      if (operation === 'serverStatus') return { ok: 1, host: 'synthetic-server', pid: 42 };
      if (operation === 'replSetInitiate') { existing = true; return race ? { ok: 0, code: 23 } : { ok: 1 }; }
      if (operation === 'isMaster') return { ok: 1, ismaster: true, setName: expected.name,
        me: expected.host, primary: expected.host, hosts: [expected.host] };
      if (operation === 'collStats') return { ok: 1, capped: true, maxSize: storedOplogMiB * 1048576 };
      if (operation === 'dbStats') return { ok: 1, fsTotalSize: 2 * 1024 ** 3, fsUsedSize: 2 * 1024 ** 3 - freeBytes };
      throw new Error('Unexpected lifecycle command');
    }
  };
  const context = { _getEnv: name => name === 'OPENLAP_RS_ACTION' ? mode : env[name],
    Date: { now: () => { if (unavailable) clock += 30000; return clock; } },
    sleep: () => {}, quit: code => { exit = code; },
    Mongo: function () { attempts++; if (unavailable) throw new Error('synthetic connection failure'); return { getDB: () => database }; } };
  vm.runInNewContext(fs.readFileSync(script, 'utf8'), context);
  return { exit, calls, attempts };
}
for (const options of [{ existing: false }, { existing: false, race: true }, { existing: true }]) {
  const result = lifecycle(options); assert.equal(result.exit, 0);
  assert.equal(result.calls.filter(name => name === 'replSetInitiate').length, options.existing ? 0 : 1);
  assert.equal(result.calls.filter(name => name === 'dbStats').length, options.existing ? 0 : 1);
  assert(!result.calls.includes('replSetReconfig')); cases++;
}
const wrong = lifecycle({ wrongHost: true }); assert.equal(wrong.exit, 30);
assert(!wrong.calls.includes('replSetInitiate')); cases++;
const down = lifecycle({ unavailable: true }); assert.equal(down.exit, 40);
assert(down.attempts >= 2 && down.attempts < 10 && down.calls.length === 0); cases++;
const verifyOnly = lifecycle({ existing: false, mode: 'verify' }); assert.equal(verifyOnly.exit, 40);
assert(!verifyOnly.calls.includes('replSetInitiate')); cases++;
const resized = lifecycle({ storedOplogMiB: 32 }); assert.equal(resized.exit, 30);
assert(!resized.calls.includes('replSetInitiate') && !resized.calls.includes('replSetResizeOplog')); cases++;
const lowCapacity = lifecycle({ existing: false, freeBytes: 272 * 1048576 - 1 });
assert.equal(lowCapacity.exit, 21); assert(!lowCapacity.calls.includes('replSetInitiate')); cases++;
const existingLowCapacity = lifecycle({ existing: true, freeBytes: 0 });
assert.equal(existingLowCapacity.exit, 0); assert(!existingLowCapacity.calls.includes('dbStats')); cases++;
const threshold = lifecycle({ existing: false, freeBytes: 272 * 1048576 });
assert.equal(threshold.exit, 0); cases++;
for (const stats of [
  { ok: 0 }, { ok: 1 }, { ok: 1, fsTotalSize: 1000, fsUsedSize: 1001 },
  { ok: 1, fsTotalSize: Infinity, fsUsedSize: 0 }, { ok: 1, fsTotalSize: 1024 ** 3, fsUsedSize: -1 },
  { ok: 1, fsTotalSize: 1024 ** 3, fsUsedSize: 0.5 }]) {
  rejected(() => rs.initialCapacity({ getSiblingDB: () => ({ runCommand: () => stats }) }, expected), 21); cases++;
}
console.log(JSON.stringify({ status: 'SYNTHETIC_REPLICA_SET_CONFIGURATION_VERIFIED', cases }));
