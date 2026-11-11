/* MongoDB4.4 shell. Only first initialization can write replica-set metadata. */
(function () {
    'use strict';
    function require(value, code, check) {
        if (!value) { var error = new Error('Replica-set prerequisite rejected.'); error.exitCode = code; error.check = check || 'prerequisite'; throw error; }
    }
    function object(value) {
        var kind = Object.prototype.toString.call(value);
        return kind === '[object Object]' || kind === '[object BSON]';
    }
    function numeric(value) {
        if (typeof value === 'number') { return value; }
        if (value && typeof value === 'object' && typeof value.toNumber === 'function') { return value.toNumber(); }
        return NaN;
    }
    function settings(env) {
        var name = env.OPENLAP_MONGODB_REPLICA_SET, host = env.OPENLAP_MONGODB_REPLICA_HOST;
        var size = env.OPENLAP_MONGODB_OPLOG_SIZE_MIB;
        [name, host, size].forEach(function (value) { require(typeof value === 'string' && !/[\x00-\x20\x7f]/.test(value), 10); });
        require(typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name), 10);
        require(typeof host === 'string' && host.length <= 259 && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?:27017$/.test(host), 10);
        var dns = host.slice(0, -6);
        require(!/(^|\.)localhost($|\.)/.test(dns) && !/^[0-9.]+$/.test(dns), 10);
        dns.split('.').forEach(function (label) { require(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label), 10); });
        require(typeof size === 'string' && /^[1-9][0-9]{0,3}$/.test(size) && Number(size) >= 16 && Number(size) <= 1024, 10);
        return { name: name, host: host, oplogMiB: Number(size) };
    }
    function configuration(config, expected) {
        require(object(config) && config._id === expected.name && numeric(config.protocolVersion) === 1
                && config.writeConcernMajorityJournalDefault === true && !config.configsvr
                && Array.isArray(config.members) && config.members.length === 1, 30, 'configuration-header');
        var member = config.members[0];
        require(object(member) && Object.keys(member).sort().join(',') === '_id,arbiterOnly,buildIndexes,hidden,host,priority,slaveDelay,tags,votes', 30, 'member-fields');
        require(member._id === 0 && member.host === expected.host && member.priority === 1 && member.votes === 1
                && member.arbiterOnly === false && member.hidden === false && member.buildIndexes === true
                && numeric(member.slaveDelay) === 0 && object(member.tags) && Object.keys(member.tags).length === 0, 30, 'member-values');
        var s = config.settings;
        require(object(s) && Object.keys(s).sort().join(',') === 'catchUpTakeoverDelayMillis,catchUpTimeoutMillis,chainingAllowed,electionTimeoutMillis,getLastErrorDefaults,getLastErrorModes,heartbeatIntervalMillis,heartbeatTimeoutSecs,replicaSetId', 30, 'settings-fields');
        require(object(s) && s.chainingAllowed === true && s.heartbeatIntervalMillis === 2000
                && s.heartbeatTimeoutSecs === 10 && s.electionTimeoutMillis === 10000
                && s.catchUpTimeoutMillis === -1 && s.catchUpTakeoverDelayMillis === 30000
                && object(s.getLastErrorModes) && Object.keys(s.getLastErrorModes).length === 0
                && object(s.getLastErrorDefaults) && Object.keys(s.getLastErrorDefaults).sort().join(',') === 'w,wtimeout' && s.getLastErrorDefaults.w === 1
                && s.getLastErrorDefaults.wtimeout === 0 && s.replicaSetId, 30, 'settings-values');
    }
    function prerequisites(admin, expected) {
        var build = admin.runCommand({ buildInfo: 1 }), options = admin.runCommand({ getCmdLineOpts: 1 });
        var fcv = admin.runCommand({ getParameter: 1, featureCompatibilityVersion: 1 });
        require(build.ok === 1 && /^4\.4\./.test(build.version) && options.ok === 1 && fcv.ok === 1, 20);
        require(fcv.featureCompatibilityVersion.version === '4.4' && !fcv.featureCompatibilityVersion.targetVersion
                && !fcv.featureCompatibilityVersion.previousVersion, 20);
        var replication = options.parsed.replication || {};
        require((replication.replSetName || replication.replSet) === expected.name
                && numeric(replication.oplogSizeMB) === expected.oplogMiB, 20);
        require(!options.parsed.sharding && (!options.parsed.security || !options.parsed.security.authorization
                || options.parsed.security.authorization === 'disabled'), 20);
    }
    function primary(admin, expected) {
        var hello = admin.runCommand({ isMaster: 1 });
        if (hello.ok !== 1 || hello.ismaster !== true) { return false; }
        require(hello.setName === expected.name && hello.me === expected.host && hello.primary === expected.host
                && Array.isArray(hello.hosts) && hello.hosts.length === 1 && hello.hosts[0] === expected.host
                && (!hello.arbiters || hello.arbiters.length === 0) && (!hello.passives || hello.passives.length === 0), 30);
        var oplog = admin.getSiblingDB('local').runCommand({ collStats: 'oplog.rs' });
        require(oplog.ok === 1 && oplog.capped === true && numeric(oplog.maxSize) === expected.oplogMiB * 1048576, 30);
        return true;
    }
    function main() {
        var expected = settings({ OPENLAP_MONGODB_REPLICA_SET: _getEnv('OPENLAP_MONGODB_REPLICA_SET'),
            OPENLAP_MONGODB_REPLICA_HOST: _getEnv('OPENLAP_MONGODB_REPLICA_HOST'),
            OPENLAP_MONGODB_OPLOG_SIZE_MIB: _getEnv('OPENLAP_MONGODB_OPLOG_SIZE_MIB') });
        var mode = _getEnv('OPENLAP_RS_ACTION'); require(mode === 'initialize' || mode === 'verify', 10);
        var deadline = Date.now() + (mode === 'verify' ? 5000 : 120000), admin = null;
        while (Date.now() < deadline) {
            try { admin = new Mongo('127.0.0.1:27017').getDB('admin'); if (admin.runCommand({ ping: 1 }).ok === 1) { break; } }
            catch (_connection) { admin = null; }
            if (mode === 'verify') { require(false, 40); }
            sleep(250);
        }
        require(admin, 40); prerequisites(admin, expected);
        var current = admin.runCommand({ replSetGetConfig: 1 });
        if (current.ok === 1) { configuration(current.config, expected); }
        else { require(current.code === 94 && mode === 'initialize', 40); }
        if (mode === 'initialize') {
            var local = admin.runCommand({ serverStatus: 1 }), advertised = null;
            require(local.ok === 1, 20);
            while (Date.now() < deadline) {
                try { advertised = new Mongo(expected.host).getDB('admin').runCommand({ serverStatus: 1 }); }
                catch (_unavailable) { advertised = null; }
                if (advertised && advertised.ok === 1) { break; }
                sleep(250);
            }
            require(advertised && advertised.ok === 1, 40);
            require(advertised.host === local.host && numeric(advertised.pid) === numeric(local.pid), 31);
            if (current.ok !== 1) {
                var initiated = admin.runCommand({ replSetInitiate: { _id: expected.name, members: [{ _id: 0, host: expected.host }] } });
                require(initiated.ok === 1 || initiated.code === 23, 40);
            }
        }
        while (Date.now() < deadline) {
            current = admin.runCommand({ replSetGetConfig: 1 });
            require(current.ok === 1, 40); configuration(current.config, expected);
            if (primary(admin, expected)) { return; }
            if (mode === 'verify') { require(false, 40); }
            sleep(250);
        }
        require(false, 40);
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { settings: settings, configuration: configuration, prerequisites: prerequisites, primary: primary };
    } else {
        try { main(); quit(0); } catch (error) { quit(error.exitCode || 50); }
    }
}());
