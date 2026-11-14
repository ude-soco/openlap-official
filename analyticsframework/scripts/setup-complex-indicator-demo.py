#!/usr/bin/env python3
"""Create isolated, synthetic local examples through the real indicator APIs.

Only the labelled demo MongoDB's secondary database is seeded directly. Accounts
and indicators are created through HTTP. Credentials stay in a private receipt.
"""

import argparse
import copy
import hashlib
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


FIXTURE = "openlap-complex-indicators-v1"
CONTAINER_LABEL = "org.openlap.demo"
CONTAINER_LABEL_VALUE = "complex-indicators-v1"
EMAIL = "complex.indicators@example.test"
ACTOR = "complex-demo-student-001"
LRS_ID = "6f70656e6c6170636f6d706c"
LRS_TITLE = "Complex indicator demo (synthetic data)"
TYPE = "https://example.test/openlap-demo/activity-types/material"
VIEWED = "https://example.test/openlap-demo/verbs/accessed"
ANNOTATED = "https://example.test/openlap-demo/verbs/annotated"
ACTIVITY_FIELD = "statement.object.definition.name.en-US"
ACTOR_FIELD = "statement.actor.account.name"
COUNT_METHOD = "Count N most occurring or least occurring items"
CLUSTER_METHOD = "Create clusters based on two numeric attributes using K-Means"
PALETTE = ["#008ffb", "#ff5733", "#3498db", "#2ecc71", "#9b59b6", "#f1c40f",
           "#e74c3c", "#1abc9c", "#34495e", "#d35400", "#95a5a6"]

# Counts deliberately use the source values rather than the inconsistent
# intermediate multilevel numbers in the conceptual diagram.
ACCESS = {"Material 1": 860, "Material 6": 600, "Item 1": 553,
          "Material 9": 400, "Item 2": 320, "Material 4": 126,
          "Material 10": 160, "Item 3": 90, "Material 5": 50}
STUDENTS = {"Material 1": 182, "Material 6": 175, "Item 1": 175,
            "Material 10": 160, "Item 2": 110, "Item 3": 90, "Material 5": 50}
ANNOTATIONS = {"Material 1": 43, "Material 6": 40, "Item 1": 35,
               "Material 9": 32, "Item 2": 22, "Material 4": 15, "Item 6": 6}
COMPARISON_ACCESS = ["Material 1", "Material 6", "Item 1", "Material 9", "Item 2"]
CLUSTER_ACCESS = COMPARISON_ACCESS + ["Material 4"]


class DemoError(Exception):
    pass


class ApiError(DemoError):
    def __init__(self, status, message):
        super().__init__("HTTP %s: %s" % (status, message))
        self.status = status


def local_api_url(value):
    """No remote endpoints, embedded credentials, redirects or arbitrary paths."""
    try:
        url = urlsplit(value)
        host = url.hostname
        local = host == "localhost" or (host is not None and ipaddress.ip_address(host).is_loopback)
        port = url.port
    except ValueError:
        local, port = False, None
    if (not local or url.scheme not in ("http", "https") or url.username or url.password
            or url.query or url.fragment or url.path.rstrip("/") != "/api"
            or port is None or not 1 <= port <= 65535):
        raise DemoError("Use an explicit loopback API URL and port ending in /api.")
    return urlunsplit((url.scheme, url.netloc, "/api", "", ""))


def demo_database(value):
    if not re.fullmatch(r"learninglocker_complex_demo(?:_[a-z0-9_]{1,24})?", value):
        raise DemoError("The secondary database must be learninglocker_complex_demo or its named demo suffix.")
    return value


def column(identifier, kind, title=None):
    return {"id": identifier, "type": kind, "required": True,
            "title": title or identifier, "description": "Synthetic local demo"}


def mapping(inputs, outputs):
    return {"mapping": [{"inputPort": item, "outputPort": outputs[item["id"]]}
                        for item in inputs if item["id"] in outputs]}


def data_columns(dataset):
    return dataset.get("columns", dataset)


def configuration(column_value):
    return column_value.get("configurationData", column_value.get("configuration", {}))


def fixture_data():
    statements = []
    for verb, counts in ((VIEWED, ACCESS), (ANNOTATED, ANNOTATIONS)):
        for material, count in counts.items():
            unique = STUDENTS.get(material, min(count, 20))
            for index in range(count):
                identity = "%s:%s:%s:%s" % (FIXTURE, verb, material, index)
                statements.append({
                    "_id": hashlib.sha256(identity.encode()).hexdigest()[:24],
                    "_demoFixtureId": FIXTURE, "lrs_id": LRS_ID,
                    "statement": {
                        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, identity)),
                        "actor": {"account": {"homePage": "https://example.test/openlap-demo",
                                    "name": "complex-demo-student-%03d" % (index % unique + 1)}},
                        "verb": {"id": verb, "display": {"en-US": verb.rsplit("/", 1)[1]}},
                        "object": {"id": "https://example.test/openlap-demo/materials/" + material.lower().replace(" ", "-"),
                                   "definition": {"type": TYPE, "name": {"en-US": material}}},
                        "context": {"platform": "OpenLAP complex indicator demo"},
                        "stored": "2026-02-03T12:00:00.000Z",
                    },
                })
    return {"store": {"_id": LRS_ID, "_demoFixtureId": FIXTURE, "title": LRS_TITLE,
                      "uniqueIdentifierType": "ACCOUNT_NAME", "statementCount": len(statements)},
            "statements": statements}


def mongo_seed_script(fixture):
    payload = json.dumps(fixture, separators=(",", ":"))
    fingerprint = hashlib.sha256(payload.encode()).hexdigest()
    return """const f = %s;
const markerId = %s;
const fingerprint = %s;
const allowed = ['lrs','statements','openlap_demo_fixture'];
if (db.getCollectionNames().some(n => !allowed.includes(n) && !n.startsWith('system.'))) throw Error('Demo database contains unrelated collections');
for (const n of ['lrs','statements']) {
  if (db.getCollection(n).findOne({_demoFixtureId: {$ne: markerId}})) throw Error('Demo database contains unrelated records');
}
const old = db.openlap_demo_fixture.findOne({_id: markerId});
if (old && old.fingerprint !== fingerprint) throw Error('Fixture identity changed; use a new dedicated demo database');
if (!old && (db.lrs.countDocuments({}) || db.statements.countDocuments({}))) throw Error('An unmarked nonempty database cannot be seeded');
db.openlap_demo_fixture.updateOne({_id: markerId}, {$setOnInsert: {fingerprint, status:'SEEDING'}}, {upsert:true});
f.store._id = ObjectId(f.store._id);
db.lrs.updateOne({_id:f.store._id}, {$setOnInsert:f.store}, {upsert:true});
for(let i=0; i<f.statements.length; i+=400) {
 const writes = f.statements.slice(i,i+400).map(row => {
   row._id = ObjectId(row._id); row.lrs_id = ObjectId(row.lrs_id);
   return {updateOne:{filter:{_id:row._id}, update:{$setOnInsert:row}, upsert:true}};
 });
 db.statements.bulkWrite(writes, {ordered:true});
}
if (db.lrs.countDocuments({}) !== 1 || db.statements.countDocuments({}) !== f.statements.length) throw Error('Fixture counts mismatch');
if (db.lrs.countDocuments({_id:{$type:'objectId'}}) !== 1 || db.statements.countDocuments({lrs_id:{$type:'objectId'}}) !== f.statements.length) throw Error('Fixture BSON types mismatch');
db.openlap_demo_fixture.updateOne({_id:markerId}, {$set:{status:'READY'}});
print(JSON.stringify({fixture:markerId, statements:f.statements.length, fingerprint}));
""" % (payload, json.dumps(FIXTURE), json.dumps(fingerprint))


def seed_secondary(container, database):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,80}", container):
        raise DemoError("Use the name of the dedicated demo MongoDB container.")
    result = subprocess.run(["docker", "inspect", "--format",
                             '{"running":{{json .State.Running}},"labels":{{json .Config.Labels}}}', container],
                            capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise DemoError("The dedicated demo MongoDB container could not be inspected.")
    try:
        inspected = json.loads(result.stdout)
    except ValueError:
        raise DemoError("The MongoDB container metadata is invalid.") from None
    if not inspected.get("running") or (inspected.get("labels") or {}).get(CONTAINER_LABEL) != CONTAINER_LABEL_VALUE:
        raise DemoError("MongoDB must be running with label %s=%s." % (CONTAINER_LABEL, CONTAINER_LABEL_VALUE))
    result = subprocess.run(["docker", "exec", "-i", container, "mongosh", "--quiet", database, "--file", "/dev/stdin"],
                            input=mongo_seed_script(fixture_data()), capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise DemoError("Synthetic LRS seeding failed; inspect only this dedicated demo container.")
    # mongosh can include its prompt. Read only the fixed typed marker line.
    for line in reversed(result.stdout.splitlines()):
        start = line.find('{"fixture":')
        if start >= 0:
            return json.loads(line[start:])
    raise DemoError("MongoDB did not acknowledge the synthetic fixture.")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise DemoError("The local demo API must not redirect requests.")


class Api:
    def __init__(self, base):
        self.base = local_api_url(base)
        self.opener = build_opener(NoRedirect())
        self.token = None

    def call(self, method, path, body=None, form=None, auth=True):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        elif form is not None:
            data = urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if auth and self.token:
            headers["Authorization"] = "Bearer " + self.token
        req = Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=90) as response:
                raw = response.read(4 * 1024 * 1024 + 1)
                if len(raw) > 4 * 1024 * 1024:
                    raise DemoError("The local API response exceeds the demo limit.")
        except HTTPError as error:
            try:
                message = json.loads(error.read(8192)).get("message", "Request rejected")
            except (ValueError, AttributeError):
                message = "Request rejected"
            raise ApiError(error.code, str(message)[:300]) from None
        except URLError:
            raise DemoError("The local backend is unavailable at the selected loopback address.") from None
        try:
            return json.loads(raw)
        except ValueError:
            raise DemoError("The local API returned an invalid JSON response.") from None

    def data(self, method, path, body=None):
        return self.call(method, path, body)["data"]

    def login(self, email, password):
        result = self.call("POST", "/login", form={"userEmail": email, "password": password}, auth=False)
        self.token = result["access_token"]


def private_receipt(path, api_url, database):
    path = Path(path).absolute()
    if path.is_symlink() or not path.parent.is_dir() or path.parent.is_symlink():
        raise DemoError("Use a regular receipt file in an existing private directory.")
    parent_info = path.parent.stat()
    if parent_info.st_uid != os.getuid() or stat.S_IMODE(parent_info.st_mode) & 0o077:
        raise DemoError("The receipt directory must belong to you and have mode 0700.")
    checkout = subprocess.run(["git", "-C", str(path.parent), "rev-parse", "--show-toplevel"],
                              capture_output=True, text=True, timeout=10)
    if checkout.returncode == 0:
        ignored = subprocess.run(["git", "-C", checkout.stdout.strip(), "check-ignore", "--quiet", str(path)],
                                 capture_output=True, timeout=10)
        if ignored.returncode != 0:
            raise DemoError("The credential receipt must be outside Git or in an explicitly ignored directory.")
    if path.exists():
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
            raise DemoError("The existing receipt must be a private regular file owned by you.")
        if info.st_size > 256 * 1024:
            raise DemoError("The existing receipt is too large.")
        record = json.loads(path.read_text())
        if (record.get("fixture") != FIXTURE or record.get("apiUrl") != api_url
                or record.get("secondaryDatabase") != database or record.get("email") != EMAIL):
            raise DemoError("The receipt belongs to another demo setup.")
    else:
        record = {"fixture": FIXTURE, "apiUrl": api_url, "secondaryDatabase": database,
                  "email": EMAIL, "password": "OlDemo-" + secrets.token_urlsafe(18) + "9!",
                  "indicators": {}, "status": "PREPARING"}
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            json.dump(record, stream, indent=2)
            stream.write("\n")
    return path, record


def save_receipt(path, record):
    temporary = path.with_name(path.name + ".partial")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(descriptor, "w") as stream:
            json.dump(record, stream, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def one_named(rows, name, description):
    matches = [row for row in rows if row.get("name") == name]
    if len(matches) != 1:
        raise DemoError("Expected one %s named %r; prepare the reviewed demo plugins first." % (description, name))
    return matches[0]


def parameters(api, method_id, values):
    result = copy.deepcopy(api.data("GET", "/v1/analytics/methods/params/" + method_id))
    for item in result:
        item["value"] = values.get(item["id"], item.get("defaultValue"))
    missing = set(values) - {item["id"] for item in result}
    if missing:
        raise DemoError("The installed method does not declare the demo parameters.")
    return result


def select_cluster_method(api, methods):
    """Names can legitimately repeat across installed plugin implementations."""
    eligible = []
    for method in sorted((row for row in methods if row.get("name") == CLUSTER_METHOD), key=lambda row: row["id"]):
        identifier = method["id"]
        inputs = api.data("GET", "/v1/analytics/methods/inputs/" + identifier)
        outputs = api.data("GET", "/v1/analytics/methods/outputs/" + identifier)
        params = api.data("GET", "/v1/analytics/methods/params/" + identifier)
        input_types = {item["id"]: item["type"] for item in inputs}
        output_types = {item["id"]: item["type"] for item in outputs}
        param_types = {item["id"]: item.get("dataType") for item in params}
        if (input_types == {"attribute_1": "Numeric", "attribute_2": "Numeric"}
                and all(output_types.get(key) == value for key, value in {
                    "attribute_1": "Numeric", "attribute_2": "Numeric", "cluster_name": "Text"}.items())
                and all(param_types.get(key) == "INTEGER" for key in
                        ("cluster_count", "kmean_seed", "kmean_iterations"))):
            eligible.append(method)
    if not eligible:
        raise DemoError("No installed K-means method declares the demo's two-numeric-feature contract.")
    return eligible[0], len(eligible)


def indicator_list(api):
    result = []
    for page in range(20):
        data = api.data("GET", "/v1/indicators/my?size=100&page=%s" % page)
        result.extend(data["content"])
        if data.get("last", True):
            return result
    raise DemoError("The demo account contains too many indicators for this setup helper.")


def ensure_indicator(api, path, payload, record, receipt):
    matches = [item for item in indicator_list(api) if item.get("indicatorName", item.get("name")) == payload["name"]]
    if len(matches) > 1:
        raise DemoError("A demo indicator name is duplicated; no existing rows were modified.")
    if matches:
        identifier = matches[0]["id"]
        details = api.data("GET", "/v1/indicators/" + identifier)
        try:
            saved = json.loads(details.get("configuration") or "{}")
        except ValueError:
            saved = {}
        if saved.get("demoFixtureId") != FIXTURE:
            raise DemoError("An existing indicator has this name but is not an unchanged demo record.")
        if saved != json.loads(payload["configuration"]):
            raise DemoError("An existing demo indicator was edited; the setup helper will not reset it.")
    else:
        api.call("POST", path + "/create", payload)
        matches = [item for item in indicator_list(api) if item.get("indicatorName", item.get("name")) == payload["name"]]
        if len(matches) != 1:
            raise DemoError("The new saved indicator could not be identified.")
        identifier = matches[0]["id"]
    record["indicators"][payload["name"]] = identifier
    save_receipt(receipt, record)
    return identifier


def assert_counts(dataset, expected, key_id="item_name", value_id="item_count"):
    columns = data_columns(dataset)
    actual = dict(zip(columns[key_id]["data"], columns[value_id]["data"]))
    if set(actual) != set(expected) or any(float(actual[key]) != value for key, value in expected.items()):
        raise DemoError("A real source analysis did not match the synthetic fixture counts.")


def inline_scripts(code):
    """Extract inline script bodies using HTML tag parsing, including valid spaced end tags."""
    class Scripts(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.current = None
            self.values = []
        def handle_starttag(self, tag, attrs):
            if tag.lower() == "script":
                self.current = [] if "src" not in dict(attrs) else None
        def handle_data(self, value):
            if self.current is not None:
                self.current.append(value)
        def handle_endtag(self, tag):
            if tag.lower() == "script" and self.current is not None:
                self.values.append("".join(self.current))
                self.current = None
    parsed = Scripts()
    parsed.feed(unquote(code))
    parsed.close()
    return parsed.values


def check_chart_syntax(code):
    """Compile inline scripts without running them or fetching external assets."""
    scripts = inline_scripts(code)
    if not scripts:
        raise DemoError("The generated chart has no inline renderer.")
    for script in scripts:
        compiled = subprocess.run(["node", "-e", "new (require('node:vm').Script)(require('node:fs').readFileSync(0,'utf8'));"],
                                  input=script, text=True, capture_output=True, timeout=15)
        if compiled.returncode:
            raise DemoError("The generated chart contains invalid JavaScript; labels must survive plugin rendering.")


def check_c3_text_roundtrip(code, expected_series, expected_title):
    """Capture the generated C3 configuration in a bounded VM without DOM/network."""
    scripts = inline_scripts(code)
    if len(scripts) != 1:
        raise DemoError("Expected one inline C3 renderer for text roundtrip verification.")
    probe = """const vm=require('node:vm'), assert=require('node:assert/strict');
const p=JSON.parse(require('node:fs').readFileSync(0,'utf8')); const seen=[];
new vm.Script(p.script).runInNewContext({c3:{generate(options){seen.push(options);return {};}}},{timeout:1000});
assert.equal(seen.length,1); const chart=seen[0];
const names = chart.data.rows ? Array.from(chart.data.rows[0]) : Array.from(chart.data.columns || [], column => column[0]);
assert.deepEqual(names.sort(),p.series.slice().sort());
assert.equal(chart.title.text,p.title);
"""
    result = subprocess.run(["node", "-e", probe], input=json.dumps({
        "script": scripts[0], "series": expected_series, "title": expected_title}),
        capture_output=True, text=True, timeout=15)
    if result.returncode:
        raise DemoError("C3 text labels did not roundtrip to their original values in the renderer configuration.")


def assert_scatter_series(series, expected_pairs, clusters, colors, expected_groups=None):
    points = []
    for item in series:
        if len(item["x"]) != len(item["y"]):
            raise DemoError("The rendered scatter chart has mismatched coordinates.")
        points.extend((float(x), float(y)) for x, y in zip(item["x"], item["y"]))
    if (len(series) != clusters or sorted(points) != sorted((float(x), float(y)) for x, y in expected_pairs)
            or len(set(colors)) < clusters):
        raise DemoError("The rendered scatter chart must preserve every analyzed point and distinguish its clusters.")
    if expected_groups is not None:
        actual_groups = {item["name"]: sorted((float(x), float(y)) for x, y in zip(item["x"], item["y"])) for item in series}
        desired = {name: sorted((float(x), float(y)) for x, y in pairs) for name, pairs in expected_groups.items()}
        if actual_groups != desired:
            raise DemoError("The rendered scatter chart groups differ from the real analysis assignments.")


def check_c3_scatter_points(code, expected_pairs, clusters, assignments):
    """Verify actual C3 coordinates, not just the preceding analysis row count."""
    scripts = inline_scripts(code)
    if len(scripts) != 1:
        raise DemoError("Expected one C3 scatter renderer.")
    probe = """const vm=require('node:vm'); const seen=[];
new vm.Script(JSON.parse(require('node:fs').readFileSync(0,'utf8'))).runInNewContext({c3:{generate(options){seen.push(options);return {};}}},{timeout:1000});
if(seen.length!==1)throw Error('Expected one chart'); const chart=seen[0];
const columns=new Map(chart.data.columns.map(column=>[column[0],Array.from(column).slice(1)]));
const series=Object.entries(chart.data.xs).map(([name,x])=>({name:chart.data.names?.[name]||name,x:columns.get(x),y:columns.get(name)}));
console.log(JSON.stringify({series,colors:chart.color.pattern}));
"""
    result = subprocess.run(["node", "-e", probe], input=json.dumps(scripts[0]),
                            capture_output=True, text=True, timeout=15)
    if result.returncode:
        raise DemoError("Could not inspect the generated C3 scatter coordinates.")
    captured = json.loads(result.stdout)
    expected_groups = {}
    for pair, name in zip(expected_pairs, assignments):
        expected_groups.setdefault(name, []).append(pair)
    assert_scatter_series(captured["series"], expected_pairs, clusters, captured["colors"], expected_groups)


def basic_payload(api, method, library, chart, title, names, verb, unique=False):
    inputs = api.data("GET", "/v1/analytics/methods/inputs/" + method["id"])
    output_ports = api.data("GET", "/v1/analytics/methods/outputs/" + method["id"])
    output_by_id = {item["id"]: item for item in output_ports}
    raw_ports = {"item_name": column(ACTIVITY_FIELD, "Text", "Activities"),
                 "users": column(ACTOR_FIELD, "Text", "Users")}
    analytics_mapping = mapping(inputs, raw_ports)
    params = parameters(api, method["id"], {"count_direction": "Most Occurring", "return_count": -1,
                                           "search_type": "Unique items" if unique else "All items"})
    stores = [{"lrsId": LRS_ID, "uniqueIdentifier": ACTOR}]
    selected_lrs = dict(stores[0], id=LRS_ID, title=LRS_TITLE, uniqueIdentifierType="ACCOUNT_NAME")
    query = {"lrsStores": stores, "activityTypes": [TYPE], "actionOnActivities": [verb],
             "activities": {ACTIVITY_FIELD: names},
             "duration": {"from": "2026-01-01T00:00:00.000Z", "until": "2026-12-31T23:59:59.999Z"},
             "outputs": [ACTIVITY_FIELD, ACTOR_FIELD], "userQueryCondition": "INCLUDE_ME"}
    analyzed = api.data("POST", "/v1/indicators/basic/analyze", {
        "indicatorQuery": query, "analyticsTechniqueId": method["id"],
        "analyticsTechniqueParams": params, "analyticsTechniqueMapping": analytics_mapping})
    expected = {name: (STUDENTS[name] if unique else (ACCESS if verb == VIEWED else ANNOTATIONS)[name]) for name in names}
    assert_counts(analyzed, expected)
    chart_inputs = chart.get("chartInputs") or api.data("GET", "/v1/visualizations/types/" + chart["id"] + "/inputs")
    chart_mapping = mapping(chart_inputs, {"xAxisStrings": output_by_id["item_name"],
                                           "yAxisValues": output_by_id["item_count"]})
    vis_params = {"height": 500, "width": 750, "chartTitle": title, "showLegend": True,
                  "showXAxis": True, "showYAxis": True, "sortingOrder": "desc"}
    editor = {
        "demoFixtureId": FIXTURE, "indicator": {"type": "BASIC", "indicatorName": title},
        "dataset": {"myLRSList": [selected_lrs], "selectedLRSList": [selected_lrs]},
        "filters": {"selectedUserFilter": "INCLUDE_ME", "selectedTime": query["duration"],
            "activityTypesList": [{"id": TYPE, "name": "Material"}], "selectedActivities": [{
                "selectedActivityType": {"id": TYPE, "name": "Material"},
                "selectedActionList": [{"id": verb, "name": verb.rsplit("/", 1)[1]}],
                "selectedActivityList": [{"id": name, "name": name, "queryId": ACTIVITY_FIELD} for name in names]}]},
        "analysis": {"analyticsMethodList": [method], "inputs": inputs, "params": params,
            "selectedAnalyticsMethod": {"method": method, "mapping": analytics_mapping},
            "analyzedData": data_columns(analyzed)},
        "visualization": {"libraryList": [library], "selectedLibrary": library, "typeList": [chart],
            "selectedType": chart, "inputs": chart_inputs, "params": vis_params,
            "mapping": chart_mapping, "previewData": {"displayCode": [], "scriptData": {}}},
        "lockedStep": {name: {"locked": False, "openPanel": name == "visualization", "step": str(index + 1)}
                       for index, name in enumerate(("dataset", "filters", "analysis", "visualization", "finalize"))},
    }
    return {"name": title, "indicatorType": "BASIC", "indicatorQuery": query,
            "analyticsTechniqueId": method["id"], "analyticsTechniqueParams": params,
            "analyticsTechniqueMapping": analytics_mapping, "visualizationLibraryId": library["id"],
            "visualizationTypeId": chart["id"], "visualizationParams": vis_params,
            "visualizationMapping": chart_mapping, "configuration": json.dumps(editor)}, analyzed


def setup(options):
    api = Api(options.api_url)
    database = demo_database(options.secondary_db)
    receipt, record = private_receipt(options.receipt, api.base, database)
    record["secondaryFixture"] = seed_secondary(options.mongo_container, database)
    save_receipt(receipt, record)
    try:
        api.login(record["email"], record["password"])
    except ApiError as error:
        if error.status not in (401, 404):
            raise
        api.call("POST", "/v1/register", {
            "name": "Complex Indicator Demo", "email": record["email"],
            "password": record["password"], "confirmPassword": record["password"], "role": "ROLE_USER",
            "lrsConsumerRequest": {"lrsId": LRS_ID, "uniqueIdentifier": ACTOR}}, auth=False)
        api.login(record["email"], record["password"])
    record["status"] = "ACCOUNT_READY"
    save_receipt(receipt, record)
    methods = api.data("GET", "/v1/analytics/methods")
    method = one_named(methods, COUNT_METHOD, "analytics method")
    libraries = api.data("GET", "/v1/visualizations/libraries")
    library = one_named(libraries, "C3.js", "visualization library")
    types = api.data("GET", "/v1/visualizations/libraries/" + library["id"] + "/types")
    bars = [item for item in types if item.get("imageCode") == "Bar"]
    if len(bars) != 1:
        raise DemoError("The reviewed C3 bar chart must be installed exactly once.")
    basics = [
        ("[Complex demo] Material accesses", COMPARISON_ACCESS, VIEWED, False),
        ("[Complex demo] Students per material", list(STUDENTS), VIEWED, True),
        ("[Complex demo] Accesses for clustering", CLUSTER_ACCESS, VIEWED, False),
        ("[Complex demo] Material annotations", list(ANNOTATIONS), ANNOTATED, False),
    ]
    source_ids = []
    for title, names, verb, unique in basics:
        payload, analyzed = basic_payload(api, method, library, bars[0], title, names, verb, unique)
        source_ids.append(ensure_indicator(api, "/v1/indicators/basic", payload, record, receipt))
    record["status"] = "BASIC_INDICATORS_READY"
    save_receipt(receipt, record)
    if not options.basics_only:
        create_complex_examples(api, source_ids, methods, library, types, record, receipt)
    print("Prepared local synthetic demo; private login and indicator IDs: " + str(receipt))
    print("Demo status: " + record["status"])


def create_complex_examples(api, source_ids, methods, library, types, record, receipt):
    available = api.data("GET", "/v1/indicators/sources?size=100&page=0")["content"]
    by_id = {item["id"]: item for item in available}
    if not all(identifier in by_id for identifier in source_ids):
        raise DemoError("The lightweight source API did not return the saved demo basic indicators.")

    def source(identifier, label):
        original = by_id[identifier]
        return {"id": identifier, "name": original["name"], "analyticsMethod": original["analyticsMethod"],
                "outputs": original["outputs"], "keyColumnId": "item_name", "measureColumnIds": ["item_count"],
                "label": label, "filterSummary": "2026-01-01 to 2026-12-31 · All users · 1 activity type"}

    def composition(config):
        items = [{"indicatorId": item["id"], "label": item["label"],
                  "columnToMerge": next(port for port in item["outputs"] if port["id"] == item["keyColumnId"]),
                  "measureColumnIds": item["measureColumnIds"]} for item in config["sources"]]
        return {"indicators": items, **({"columnToMerge": items[0]["columnToMerge"]}
                                       if config["type"] == "COMPOSITE" else {})}

    def chart(image_code):
        found = [item for item in types if item.get("imageCode") == image_code]
        if len(found) != 1:
            raise DemoError("The reviewed C3 %s chart must be installed exactly once." % image_code)
        return found[0]

    def state(kind, title, sources):
        return {"demoFixtureId": FIXTURE, "schemaVersion": 1, "type": kind, "name": title,
                "sources": sources, "analysis": {"methodId": "", "mapping": {"mapping": []}, "params": []},
                "visualization": {"libraryId": library["id"], "typeId": "", "mapping": {"mapping": []},
                    "params": {"height": 500, "width": 750, "chartTitle": title, "showLegend": True,
                               "showXAxis": True, "showYAxis": True, "colorsArray": PALETTE}, "dataMode": "combined"}}

    def request(config):
        value = {**composition(config), "name": config["name"], "indicatorType": config["type"],
                 "visualizationLibraryId": library["id"], "visualizationTypeId": config["visualization"]["typeId"],
                 "visualizationMapping": config["visualization"]["mapping"],
                 "visualizationParams": config["visualization"]["params"], "configuration": json.dumps(config)}
        if config["type"] == "MULTI_LEVEL":
            value.update(analyticsTechniqueId=config["analysis"]["methodId"],
                         analyticsTechniqueMapping=config["analysis"]["mapping"],
                         analyticsTechniqueParams=config["analysis"]["params"])
        return value

    def mapped_chart(config, selected, dataset, ports):
        columns = data_columns(dataset)
        inputs = selected.get("chartInputs") or api.data("GET", "/v1/visualizations/types/" + selected["id"] + "/inputs")
        config["visualization"]["typeId"] = selected["id"]
        config["visualization"]["mapping"] = mapping(inputs, {
            target: configuration(columns[origin]) for target, origin in ports.items()})
        if len(config["visualization"]["mapping"]["mapping"]) != len([item for item in inputs if item.get("required")]):
            raise DemoError("The real chart contract does not match the demo mapping.")

    composite = state("COMPOSITE", "[Complex demo] Accesses and students — all materials", [
        source(source_ids[0], "Total accesses"), source(source_ids[1], "Students")])
    merged = api.data("POST", "/v1/indicators/composite/merge", composition(composite))
    expected_union = sorted(set(COMPARISON_ACCESS) | set(STUDENTS))
    assert_combination(merged, expected_union, [
        (source_ids[0], {name: ACCESS[name] for name in COMPARISON_ACCESS}), (source_ids[1], STUDENTS)])
    mapped_chart(composite, chart("MultiLine"), merged["chartData"], {
        "xAxisStrings": "combined_key", "yAxisValues": "combined_value", "GroupBy": "combined_series"})
    payload = request(composite)
    check_chart_syntax(api.data("POST", "/v1/indicators/composite/preview", payload))
    escaped_labels = copy.deepcopy(composite)
    special_text = "Learner's \"accesses\" \\ workshop\n</script> \u2028\u2029"
    escaped_labels["sources"][0]["label"] = special_text
    escaped_labels["visualization"]["params"]["chartTitle"] = special_text
    escaped_preview = api.data("POST", "/v1/indicators/composite/preview", request(escaped_labels))
    check_chart_syntax(escaped_preview)
    series_labels = [item["label"] + " · " + next(port["title"] for port in item["outputs"] if port["id"] == "item_count")
                     for item in escaped_labels["sources"]]
    check_c3_text_roundtrip(escaped_preview, series_labels, special_text)
    composite_id = ensure_indicator(api, "/v1/indicators/composite", payload, record, receipt)

    multilevel = state("MULTI_LEVEL", "[Complex demo] Access and annotation clusters", [
        source(source_ids[2], "Total accesses"), source(source_ids[3], "Total annotations")])
    merged_response = api.data("POST", "/v1/indicators/multilevel/merge", composition(multilevel))
    intersection = merged_response.get("mergedData", merged_response)
    expected_shared = sorted(set(CLUSTER_ACCESS) & set(ANNOTATIONS))
    assert_combination(intersection, expected_shared, [
        (source_ids[2], {name: ACCESS[name] for name in CLUSTER_ACCESS}), (source_ids[3], ANNOTATIONS)])
    cluster, equivalent_methods = select_cluster_method(api, methods)
    record["clusterMethod"] = {"id": cluster["id"], "name": cluster["name"],
                               "compatibleInstalledCandidates": equivalent_methods}
    inputs = api.data("GET", "/v1/analytics/methods/inputs/" + cluster["id"])
    merged_columns = data_columns(intersection)
    multilevel["analysis"] = {
        "methodId": cluster["id"],
        "mapping": mapping(inputs, {
            "attribute_1": configuration(merged_columns["source_%s__item_count" % source_ids[2]]),
            "attribute_2": configuration(merged_columns["source_%s__item_count" % source_ids[3]])}),
        "params": parameters(api, cluster["id"], {"cluster_count": 3, "kmean_seed": 10, "kmean_iterations": 100}),
    }
    analysis_body = {**composition(multilevel), "analyticsTechniqueId": cluster["id"],
                     "analyticsTechniqueMapping": multilevel["analysis"]["mapping"],
                     "analyticsTechniqueParams": multilevel["analysis"]["params"]}
    analyzed = api.data("POST", "/v1/indicators/multilevel/analyze", analysis_body)
    result_columns = data_columns(analyzed)
    actual_pairs = list(zip(result_columns["attribute_1"]["data"], result_columns["attribute_2"]["data"]))
    expected_pairs = [(ACCESS[name], ANNOTATIONS[name]) for name in expected_shared]
    if sorted((float(x), float(y)) for x, y in actual_pairs) != sorted(expected_pairs):
        raise DemoError("The real K-means plugin did not preserve the selected source measures.")
    assignments = result_columns["cluster_name"]["data"]
    if len(assignments) != len(expected_shared) or not all(assignments) or len(set(assignments)) != 3:
        raise DemoError("The real K-means plugin did not produce six assignments across three clusters.")
    multilevel["visualization"]["dataMode"] = "individual"
    mapped_chart(multilevel, chart("ScatterPlot"), analyzed, {
        "xAxisStrings": "attribute_1", "yAxisValues": "attribute_2", "GroupBy": "cluster_name"})
    payload = request(multilevel)
    multilevel_preview = api.data("POST", "/v1/indicators/multilevel/preview", payload)
    check_chart_syntax(multilevel_preview)
    check_c3_scatter_points(multilevel_preview, actual_pairs, 3, assignments)
    multilevel_id = ensure_indicator(api, "/v1/indicators/multilevel", payload, record, receipt)

    for identifier in (composite_id, multilevel_id):
        details = api.data("GET", "/v1/indicators/" + identifier)
        if not details.get("indicatorCode"):
            raise DemoError("A saved complex indicator did not generate visualization code.")
        check_chart_syntax(details["indicatorCode"])
        if identifier == multilevel_id:
            check_c3_scatter_points(details["indicatorCode"], actual_pairs, 3, assignments)
        if not json.loads(details.get("configuration") or "{}").get("sources"):
            raise DemoError("A saved complex indicator did not retain its editable configuration.")
    record["verification"] = {"unionRows": len(expected_union), "intersectionRows": len(expected_shared),
                              "clusterAssignments": len(assignments), "clusters": len(set(assignments)),
                              "sourceValuesPreserved": True, "savedCodeGenerated": True,
                              "generatedJavascriptSyntax": True, "quotedSeriesLabel": True,
                              "rendererTextRoundtrip": True, "actualScatterPoints": 6,
                              "distinctClusterColors": True}
    record["status"] = "COMPLETE"
    save_receipt(receipt, record)


def assert_combination(dataset, keys, sources):
    columns = data_columns(dataset)
    actual_keys = columns["key"]["data"]
    if len(actual_keys) != len(keys) or set(actual_keys) != set(keys):
        raise DemoError("Combined keys do not match the deterministic synthetic union/intersection.")
    for identifier, values in sources:
        cells = columns["source_%s__item_count" % identifier]["data"]
        expected = [values.get(key, 0) for key in actual_keys]
        if len(cells) != len(keys) or any(float(a) != b for a, b in zip(cells, expected)):
            raise DemoError("Combined measures differ from their authoritative source values.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True, help="Explicit loopback backend address ending /api")
    parser.add_argument("--mongo-container", required=True, help="Dedicated, labelled local MongoDB container")
    parser.add_argument("--secondary-db", required=True, help="Dedicated learninglocker_complex_demo database")
    parser.add_argument("--receipt", type=Path, required=True, help="Private receipt containing newly generated demo credentials")
    parser.add_argument("--basics-only", action="store_true", help="Prepare source examples before the complex editor is built")
    options = parser.parse_args()
    try:
        setup(options)
    except (DemoError, OSError, ValueError, subprocess.SubprocessError, KeyError) as error:
        print("Demo setup failed: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
