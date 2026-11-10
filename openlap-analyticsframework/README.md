# OpenLAP Analytics Framework (Backend)

Spring Boot 2.1 backend for the Open Learning Analytics Platform (OpenLAP).
It exposes a REST API (served under `/api`) backed by two MongoDB databases.

- **Build tool:** Maven (wrapper included — no global Maven needed)
- **Java:** 11
- **Main class:** `com.openlap.AnalyticsFramework`
- **Default port:** `8090` (context path `/api`)

---

# Local Development (VS Code)

## Requirements

- **Java 11** (e.g. Amazon Corretto 11) — must be the active JDK
- **Docker Desktop** (for MongoDB)
- **Visual Studio Code**
- **Extension Pack for Java** (the workspace also recommends the Spring Boot and Docker extensions — VS Code will prompt you)

> Maven is **not** required — the project ships a Maven Wrapper (`./mvnw`).

## Startup

1. Start MongoDB (publishes `localhost:27017` and creates the volumes):

   ```bash
   docker compose \
       -f compose.yaml \
       -f compose.dev.yaml \
       up -d mongo
   ```

   > **Why two compose files?** `compose.yaml` is the **secure baseline**
   > (production-style) configuration: it does **not** expose the MongoDB port to
   > the host, and it leaves the P0 fail-fast guard active — so it refuses to
   > start while the insecure default secrets (`JWT_SECRET_KEY=secret`,
   > `ADMIN_PASSWORD=1234qweR`) are in effect. `compose.dev.yaml` layers on
   > local-development-only overrides:
   >
   > - publishes `27017:27017` so a host-run Spring Boot (and tools like
   >   `mongosh`/Compass) can reach Mongo on `localhost`;
   > - sets `ALLOW_INSECURE_DEFAULTS=true`, which downgrades the fail-fast guard
   >   to a warning so the backend container boots with the default dev
   >   credentials.
   >
   > `ALLOW_INSECURE_DEFAULTS=true` exists **solely to simplify local development
   > and must never be enabled in production.** Keeping the override separate
   > means the base file stays safe to deploy as-is, while developers opt in
   > explicitly. Compose merges files left-to-right, so values in
   > `compose.dev.yaml` win. (Compose does not auto-discover `compose.dev.yaml`,
   > so both `-f` flags are required.)

2. Build the project with the wrapper:

   ```bash
   ./mvnw clean package
   ```

3. Open this folder in **VS Code** and press **F5**
   (the **Run AnalyticsFramework (Spring Boot)** launch config starts the app with the debugger).
   No extra setup is needed — the launch config (and the **Spring Boot: Run** task)
   already set `ALLOW_INSECURE_DEFAULTS=true` for local development.

   Alternatively, run it from the terminal. Because the built-in dev secrets are
   insecure, the [P0 fail-fast guard](#local-development-vs-code) requires the
   local-only waiver:

   ```bash
   ALLOW_INSECURE_DEFAULTS=true ./mvnw spring-boot:run
   ```

   > Plain `./mvnw spring-boot:run` (without the flag) intentionally **fails
   > fast** with a message naming the insecure defaults — that safety check is by
   > design and must never be bypassed in production. Set strong `JWT_SECRET_KEY`
   > / `ADMIN_PASSWORD` for any real deployment.

4. The API is available at:

   ```
   http://localhost:8090/api
   ```

All endpoints are served under the **`/api`** context path (e.g. `http://localhost:8090/api/login`).

### Run the whole stack in Docker (alternative)

Instead of running Spring Boot on the host, you can build and run the backend
**and** MongoDB together in containers using the same two-file overlay:

```bash
docker compose \
    -f compose.yaml \
    -f compose.dev.yaml \
    up --build
```

Because the dev override supplies `ALLOW_INSECURE_DEFAULTS=true`, the backend
boots with the default local credentials.

Running the **base file alone** is the secure baseline and deliberately fails
fast until you provide real secrets:

```bash
docker compose -f compose.yaml up --build   # refuses to start with default secrets
```

The startup error names exactly which secrets are insecure and how to fix them
(set strong `JWT_SECRET_KEY` / `ADMIN_PASSWORD`, or — for local dev only —
`ALLOW_INSECURE_DEFAULTS=true`).

## MongoDB database routing

OpenLAP and Learning Locker use separate, explicitly named Mongo clients and templates.
Application repositories use `primaryMongoTemplate`; Learning Locker repositories in
`com.openlap.analytics_statements.repositories` use `secondaryMongoTemplate`. Unqualified
`MongoClient` and `MongoTemplate` injection selects the primary beans through `@Primary`.
Both configurations are self-contained: inheriting the same infrastructure bean names from
`AbstractMongoClientConfiguration` caused the database-routing bug in issue #650, fixed in #736.

Connection URIs and target database names are configured separately:

| Environment setting | Default | Purpose |
|---|---|---|
| `MONGODB_PRIMARY_URI` | `mongodb://127.0.0.1:27017` | OpenLAP Mongo server connection |
| `OPENLAP_MONGODB_DB` | `openlap_v2` | OpenLAP application database |
| `MONGODB_SECONDARY_URI` | `mongodb://127.0.0.1:27018` | Learning Locker Mongo server connection |
| `LRS_MONGODB_DB` | `learninglocker_v2` | Learning Locker database |

The explicit database setting determines the target even when the URI contains a different
database path. A URI without a database path is supported. For example, changing only
`MONGODB_PRIMARY_URI` to end in `/another_db` does not change the OpenLAP target; set
`OPENLAP_MONGODB_DB=another_db` to select it. Existing deployments using
`OPENLAP_MONGODB_DB=openlap` continue to target `openlap`. These settings select databases;
they do not move previously stored data between them.

### Mongo wiring regression checks

Run the focused Spring-context tests without a MongoDB server:

```bash
./mvnw -Dtest=MongoWiringTest test
```

The tests load the actual application properties and both Mongo configurations with bean
overriding disabled. They verify both registration orders, primary/default injection,
separate clients and templates, repository bindings, shared-server connections, custom
database names, URI-path precedence, and startup failure for blank database names. The
clients use closed loopback ports and perform no database operations.

For a startup smoke test, use two disposable MongoDB containers with no persistent volumes:

```bash
docker run --rm -d --name openlap-wiring-primary \
  -p 127.0.0.1:37017:27017 mongo:4.4
docker run --rm -d --name openlap-wiring-secondary \
  -p 127.0.0.1:37018:27017 mongo:4.4

./mvnw package
ALLOW_INSECURE_DEFAULTS=true \
MONGODB_PRIMARY_URI=mongodb://127.0.0.1:37017 \
MONGODB_SECONDARY_URI=mongodb://127.0.0.1:37018 \
OPENLAP_MONGODB_DB=wiring_openlap_test \
LRS_MONGODB_DB=wiring_lrs_test \
java -jar target/AnalyticsFramework-2.0-SNAPSHOT.jar \
  --server.address=127.0.0.1 --server.port=0
```

After the application finishes initialization, inspect the containers from another terminal:

```bash
docker exec openlap-wiring-primary mongo --quiet wiring_openlap_test \
  --eval 'printjson(db.getCollectionNames())'
docker exec openlap-wiring-secondary mongo --quiet wiring_lrs_test \
  --eval 'printjson(db.getCollectionNames())'
```

The primary database should contain seeded collections such as `openlap-roles`,
`openlap-users` and `analytics-goal`. The secondary database should contain none of those
application collections. Restart the application with the same settings and check that
this separation remains intact. Stop the application, then remove the disposable servers:

```bash
docker stop openlap-wiring-primary openlap-wiring-secondary
```

## Default administrator

A super-admin user is seeded automatically on first startup:

| Field    | Value           |
|----------|-----------------|
| Email    | `admin@mail.com` |
| Password | `1234qweR`      |

Log in to obtain a JWT:

```bash
curl -X POST http://localhost:8090/api/login \
  --data-urlencode "userEmail=admin@mail.com" \
  --data-urlencode "password=1234qweR"
```

Use the returned `access_token` as a bearer token for protected endpoints:

```bash
curl http://localhost:8090/api/v1/analytics/methods \
  -H "Authorization: Bearer <access_token>"
```

Public (no-auth) routes: `/api/login`, `/api/v1/register`, `/api/v1/token/refresh`, `/api/v1/code`.

## Error responses & request tracing

The framework is adopting a **unified error envelope** for API errors:

```json
{
  "timestamp": "2026-06-25T20:31:08.082Z",
  "status": 400,
  "error": "BAD_REQUEST",
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed.",
  "path": "/api/v1/register",
  "traceId": "6bbd5bf6-d3c3-4a85-872b-bde905aab69a",
  "details": { "fieldErrors": [ { "field": "email", "message": "Email is mandatory" } ] }
}
```

- **Request tracing:** every request gets a correlation id. Send your own via the
  `X-Request-Id` (or `X-Correlation-Id`) header, or one is generated. It is returned on the
  `X-Request-Id` response header, included as `traceId` in error bodies, and printed in the logs —
  so a failing response can be traced to its log lines.
- **Legacy compatibility:** while modules migrate, error bodies also include the legacy aliases
  `httpStatus` and `errors`. This is controlled by `openlap.api.error.legacy-compat` (env
  `API_ERROR_LEGACY_COMPAT`, default `true`); set it to `false` once clients consume the new fields.
- **`cause` is intentionally no longer exposed.** Exception causes / stack traces are logged
  server-side only and are never serialized into a client response.

> Migration note: framework errors (validation, malformed JSON, unmapped 500s, the new
> `OpenLapException` hierarchy) **and all authentication/authorization failures** (missing/invalid/
> expired token, login failure, access denied, refresh failure) use the unified envelope. Existing
> business-module exception handlers still return their current shapes until each module is
> migrated. HTTP status codes for security failures are unchanged.

## Environment variables

All settings have local-development defaults, so no configuration is required to run.
See [`.env.example`](.env.example) for the full list of supported variables and their meaning.

---

## Homepage content management

The administration area manages homepage news and publications through the primary MongoDB
database (`OPENLAP_MONGODB_DB`, default `openlap_v2`). The two collections are
`homepage_news` and `homepage_publications`; `content_migrations` records one-time migration
completion. Homepage content is never loaded from a frontend JSON fallback.

Each entry contains a working `draft`, a separate `published` snapshot, a version number,
created/updated timestamps, and authenticated editor identifiers (`createdBy` / `updatedBy`,
the editor's login email). Saving a draft of a published entry leaves the public snapshot
unchanged. Publishing atomically replaces that snapshot. Unpublishing removes it. Delete moves
the entry to recoverable Trash; restoring returns it to Draft and requires an explicit publish
to make it public again. These actions also appear in the existing admin audit log, whose actor
records include the editor's user ID and email.

### Migrate the existing homepage entries once

**Run this before enabling content editing or switching the homepage to API reads.** Back up
the target database first when applying this to an existing deployment. Start the local MongoDB
service if needed, then run the explicit migration from this backend directory:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d mongo

./mvnw -q -DskipTests compile \
  org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
  -Dexec.mainClass=com.openlap.content.migration.ContentMigrationApplication
```

The migration starts no HTTP server and does not seed users or start the analytics engine.
It reads `MONGODB_PRIMARY_URI` (default `mongodb://127.0.0.1:27017`) and
`OPENLAP_MONGODB_DB` (default `openlap_v2`) from the environment. Set these explicitly when
targeting another database. It uses immutable backend migration fixtures to insert the original
**7 news entries and 9 publications**, including all dates, authors, text, links, and the original
order among items with equal dates/years. These fixtures exist only for the migration command.

Stable IDs and insert-only updates prevent retries from overwriting content. The command checks
every imported draft and public snapshot against its source before recording completion. Any
pre-existing entry with the same ID but different content causes a clear collision error; resolve
it deliberately before retrying. An interrupted command that reports a failure releases its lock
and can be rerun. A completed migration returns without touching content, even if entries were
subsequently edited, unpublished, or deleted; restarting the application never reruns this import.

If a migration process was forcibly killed, first confirm that it is no longer running and keep
content editing disabled. Then recover its abandoned lock explicitly:

```bash
./mvnw -q -DskipTests compile \
  org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
  -Dexec.mainClass=com.openlap.content.migration.ContentMigrationApplication \
  -Dexec.args=--resume-abandoned
```

MongoDB transactions are not required; each entry update and the migration lock claim is atomic
on a standalone MongoDB server. Keep editing disabled until the completion message is printed.

### Content API

All paths below are relative to `/api`. `{kind}` is `news` or `publications`.

| Method and path | Access and behavior |
| --- | --- |
| `GET /v1/content/{kind}?page=0&size=6` | Public; paginated, published snapshots only, latest first |
| `GET /v1/admin/content/{kind}?page=0&size=10&search=&status=ALL&sortBy=updatedAt&direction=desc` | Super admin; filtered and sorted pagination; `ALL` excludes Trash |
| `GET /v1/admin/content/{kind}/{id}` | Super admin; current entry and both snapshots |
| `POST /v1/admin/content/{kind}` | Super admin; body `{ "draft": { ... } }`; creates Draft |
| `PUT /v1/admin/content/{kind}/{id}` | Super admin; body `{ "draft": { ... }, "version": 1 }` |
| `POST /v1/admin/content/{kind}/{id}/publish` | Super admin; body `{ "version": 1 }`; validates and publishes saved draft |
| `POST /v1/admin/content/{kind}/{id}/unpublish` | Super admin; body `{ "version": 1 }` |
| `DELETE /v1/admin/content/{kind}/{id}?version=1` | Super admin; moves entry to Trash |
| `POST /v1/admin/content/{kind}/{id}/restore` | Super admin; body `{ "version": 1 }`; restores as Draft |

Successes use the existing `ApiSuccess.data` envelope; lists contain a Spring Page (`content`,
`totalElements`, `totalPages`, etc.). Public payloads contain only the content fields plus `id`.
Admin entries include `status`, `draft`, `published`, `hasUnpublishedChanges`, `version`,
timestamps, editor identifiers, and `deletedAt`. Version-qualified atomic updates reject stale
requests with HTTP **409**, code `CONTENT_VERSION_CONFLICT`; clients should preserve unsaved
input and offer to reload the latest version.

Admin lists accept `sortBy=title|date|status|updatedAt` and `direction=asc|desc`, defaulting
to Updated descending. The `date` sort uses the news date or publication year according to
the content kind. Title sorting is case-insensitive. Sorting applies before pagination and
uses the entry ID as a stable tie breaker. Invalid sort fields or directions return HTTP 400.
The `status` filter accepts `ALL`, `DRAFT`, `PUBLISHED`, or `TRASH`.

News fields are `title`, ISO `date`, `body`, and optional `venue`. The rich-text editor saves
`body` as a standard Tiptap/ProseMirror JSON document: `doc`, `paragraph`, `text`, `hardBreak`,
`bulletList`, `orderedList`, and `listItem` nodes, with `bold`, `italic`, `underline`, or `link`
marks on text. The backend validates the parent/child structure and stores a canonical document;
link attributes contain only a safe `href`, and ordered lists contain only an integer `start`
from 1 to 100000. Known Tiptap link metadata (`target`, `rel`, `class`) and null ordered-list
`type` metadata are discarded. Unsupported attributes, nodes, marks, and raw HTML are rejected.
For example:

```json
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Read our news","marks":[{"type":"bold"}]}]}]}
```

The original ordered array of strings or `{ "text", "href" }` link parts remains supported
without conversion, so existing entries and the one-time migration retain exact content parity.
Publication fields are `title`, `authors`, four-digit `year`,
`type` (`Journal`, `Conference`, `Workshop`, `Book chapter`), `venue`, optional `pdfLink`, and
optional `details`. URL fields accept complete HTTP(S) URLs without embedded credentials.
Drafts require a title and validate all supplied fields. Publishing also requires a news date
and nonempty body, or publication authors/year/type/venue. URLs remain optional, and the UI
should hide absent actions.

Field errors use `details.fieldErrors` as a map from field name to an actionable message. Limits:
title 300 characters; news body 30000 text characters (a hard break counts as one character),
2000 rich-text nodes, and depth 12 (legacy arrays allow 500 parts); news venue 1000;
publication authors/venue 2000 each; URLs 2048; publication year 1000–2999. All validation is
enforced on the backend as well as in the editor.

## Plugin lifecycle migration (issue #1)

The current feature branch establishes protections ahead of S3-backed plugin
management. Existing JAR uploads are staged and statically inspected before
publication, with a 100 MiB upload limit, 256 MiB expanded archive limit and 10000
entry limit. Invalid or empty archives return HTTP 400 (`INVALID_PLUGIN_JAR`).
An existing filename, including a symlink, returns HTTP 409 (`PLUGIN_FILE_EXISTS`)
and is never overwritten. The local filesystem must support same-directory hard
links for atomic publication; unsupported filesystems fail without replacing data.
Archive validation does not sandbox or establish trust in uploaded code.

Runtime loaders use the catalog's recorded JAR path within the configured plugin
directory. They do not search other JARs for a matching class. This keeps versions
with identical class names independent. Verify historical `fileName` and
`frameworkLocation` values against installed binaries before deploying this change.
Missing or inconsistent paths need deliberate migration, not automatic fallback.

The following legacy DELETE operations now return HTTP 409 with code
`PLUGIN_DELETE_UNAVAILABLE`, before modifying files or catalog data:

- `/v1/analytics/methods/{id}` and `/v1/analytics/methods/delete?fileName=...`
- `/v1/visualizations/libraries/{id}` and `/v1/visualizations/types/{id}`
- `/v1/visualizations/delete?fileName=...`

Use the existing admin Enable/Disable controls to retire plugins while keeping
saved indicators functional. Dependency-safe removal and the new upload/update
workflows are subsequent increments. See the
[issue #1 plan](../docs/issue-1-plugin-management-plan.md) for migration and rollout.

An edge-only S3-compatible storage pilot has now passed live two-client access,
network isolation and persistence checks after storage pod replacement. This
branch now also includes a content-addressed Mongo artifact registry, S3 adapter,
verified per-backend cache and explicit inventory/check/apply migration utility.
Real MongoDB/Garage tests verify preservation of existing records and independent
backend execution after the source JAR is removed.

The default remains `PLUGIN_STORAGE_MODE=local`. In opt-in S3 mode, startup verifies
all installed artifacts, local discovery and legacy plugin mutations are blocked,
and cache limits prevent unbounded growth without evicting active JARs. There is
no local fallback after an S3 error. Existing live JARs have not been imported, and
the backend changes have not been deployed. Preserve files from every live replica
before any rollout. See the [artifact migration guide](../docs/plugin-artifact-migration.md)
for environment settings, commands, recovery and the remaining release gates.

SUPER_ADMIN users can now use **Add methods** or **Add library** in the admin
catalogs for the shared upload, inspection, review and activation workflow.
Inspection requires explicit trust confirmation before running constructors.
Incomplete installations stay hidden from catalog selection and runtime fetches;
saved reviews and interrupted activations can be resumed. Identical uploads are
idempotent; replacing an existing entry class uses the explicit version workflow.
The new workflow requires S3 mode after the existing-artifact migration. It has
not been deployed. See the [upload workflow guide](../docs/plugin-upload-workflow.md)
for supported JAR contracts, APIs and recovery.

**Details & versions** now supports metadata editing with revision checks and
grouped history. **Upload new version** adds an explicit old-to-new mapping review,
inherits edited details and disabled states, and installs separate immutable
catalog IDs. Previous versions remain executable for existing indicators.
After activation, admins can separately confirm disabling the previous entries
for new selections. See the [version management guide](../docs/plugin-version-management.md)
for API contracts and concurrency/recovery behavior. These changes remain on the
feature branch and have not been deployed.

Run the full backend suite and opt-in disposable MongoDB/Garage integration tests:

```bash
./mvnw test
python3 scripts/test-plugin-artifacts.py
```

Run the file, real-JAR version isolation, deletion and authorization regressions:

```bash
./mvnw -Dtest=PluginJarFilesTest,InstalledPluginVersionTest,LegacyPluginDeletionTest,SecurityAuthorizationMockMvcTest test
```

# Troubleshooting

- **MongoDB not running / connection refused** — ensure `docker compose up -d mongo` is running and
  `localhost:27017` is reachable (`docker ps` should show `...-mongo-1` as healthy). The app needs Mongo
  up before it starts.
- **Wrong Java version** — the build/run requires **Java 11**. Check with `java -version` and
  `./mvnw -version`. If a newer JDK is the default, point `JAVA_HOME` at a JDK 11
  (macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 11)`).
- **Port already in use** — if `8090` (app) or `27017` (Mongo) is taken, free the port or override it
  (`PORT` for the app; edit the Mongo `ports` mapping in `compose.yaml`).
- **Missing Maven** — not an issue anymore: use the bundled wrapper `./mvnw` (Windows: `mvnw.cmd`).
  No global Maven installation is needed.
