# Backend configuration and API reference

Use the [project installation guide](../README.md#local-installation) to start
OpenLAP locally. This reference covers backend configuration, database routing,
authentication, plugin prerequisites and homepage content contracts. Commands below
run from `analyticsframework` unless another directory is shown.

## Runtime and compatibility

- Spring Boot 4.1 exposes the REST API under `/api` on port `8090` by default.
- The Maven wrapper selects Maven 3.10.0. The application compiles to Java 17;
  the qualified container toolchain uses Java 25 LTS.
- HTTP and WebSocket converters retain the Jackson 2 compatibility bridge so
  persisted data, existing clients and published plugin APIs keep their JSON contracts.
  Both Jackson families use aligned, patched BOMs.
- Historical C3 and ApexCharts plugins use `javafx.util.Pair` and the retained
  `Customization` compatibility class. The backend includes `javafx-base` 21.0.13
  for that binary API. CI exercises the historical generators against the packaged app.
- Both Mongo templates preserve legacy string storage for decimal and large-integer
  values and annotation-based index creation. Configuration changes do not convert
  existing records or migrate database contents.

## Configuration

Spring Boot reads environment variables; it does **not** automatically load a
`.env` file. The [environment example](../analyticsframework/.env.example)
documents common settings. The complete property bindings are in
[application.properties](../analyticsframework/src/main/resources/application.properties).
Export overrides in the process that starts the backend, or supply them through
your deployment's environment configuration.

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8090` | HTTP port; every API path includes `/api` |
| `WEBAPP_URL` | `https://openlap.netlify.app,http://localhost:5173,http://localhost:5174` | Allowed frontend origins |
| `LOG_LEVEL` | `warn` | Root logging level |
| `OPENLAP_LOG_LEVEL` | `info` | OpenLAP application logging level |
| `ADMIN_NAME` | `admin` | Name of the seeded administrator |
| `ADMIN_EMAIL` | `admin@mail.com` | Login identity of the seeded administrator |
| `ADMIN_PASSWORD` | `1234qweR` | Local-development seed password |
| `JWT_SECRET_KEY` | `secret` | Local-development JWT signing secret |
| `ALLOW_INSECURE_DEFAULTS` | `false` | Explicit waiver for the known local defaults |
| `DATA_DIR` | `.` | Base directory for local plugin folders and the default cache |
| `PLUGIN_STORAGE_MODE` | `local` | Local plugin files or explicit `s3` storage |

The backend refuses to start with the built-in password or signing secret unless
`ALLOW_INSECURE_DEFAULTS=true` is set. Use that waiver only for local development;
real deployments must supply their own secret values. Changing a seed password
setting does not reset the password of an account that already exists.

## MongoDB database routing

OpenLAP and Learning Locker use separate Mongo clients and templates. Application
repositories use `primaryMongoTemplate`; Learning Locker repositories under
`com.openlap.analytics_statements.repositories` use `secondaryMongoTemplate`.
Unqualified `MongoClient` and `MongoTemplate` injection selects the primary beans
through `@Primary`.

| Setting | Default | Purpose |
| --- | --- | --- |
| `MONGODB_PRIMARY_URI` | `mongodb://127.0.0.1:27017` | OpenLAP Mongo server connection |
| `OPENLAP_MONGODB_DB` | `openlap_v2` | OpenLAP application database |
| `MONGODB_SECONDARY_URI` | `mongodb://127.0.0.1:27018` | Learning Locker Mongo server connection |
| `LRS_MONGODB_DB` | `learninglocker_v2` | Learning Locker database |

The explicit database setting takes precedence over a database path in the URI.
For example, ending `MONGODB_PRIMARY_URI` with `/another_db` does not select that
application database; set `OPENLAP_MONGODB_DB=another_db`. These settings choose
existing databases; they do not copy or move data.

Both clients may use the same MongoDB server with different database names. The
project's local installation guide uses that arrangement and explicitly points
both URIs to port `27017`. A separate Learning Locker server can instead be selected
with `MONGODB_SECONDARY_URI` and `LRS_MONGODB_DB`.

The local Mongo container supplies a database server, not a Learning Locker service
or demonstration statements. LRS selection and analytics require the corresponding
Learning Locker records and xAPI statements in the secondary database. A user must
also connect their account to an LRS with the matching actor identifier through
**Manage LRS**.

## Authentication and roles

A fresh application database receives four roles and a super-admin account. With
the local defaults, its email is `admin@mail.com` and password is `1234qweR`.
Existing accounts are retained on restart.

The administrator manages users, homepage content and plugin catalogs. Indicator
Editor access is a separate `USER` workflow; a super-admin role alone does not
provide its navigation or an LRS connection.

Login accepts form fields named `userEmail` and `password`:

```bash
curl -X POST http://localhost:8090/api/login \
  --data-urlencode 'userEmail=admin@mail.com' \
  --data-urlencode 'password=1234qweR'
```

Use the returned `access_token` for protected requests:

```bash
curl http://localhost:8090/api/v1/analytics/methods \
  -H 'Authorization: Bearer <access_token>'
```

Access tokens default to 15 minutes; refresh tokens to 5 days. See the
[authentication token policy](../analyticsframework/docs/AUTH_TOKEN_POLICY.md)
for environment overrides, refresh behavior and error status codes. Actuator
health endpoints also require authentication; public published content can be
read at `/api/v1/content/news` without a bearer token.

## Plugin prerequisites

Plugin metadata lives in MongoDB; executable JARs are stored separately. The
repository keeps the local folders but does not include installed plugin binaries:

```text
analyticsframework/jars/analytics_techniques/
analyticsframework/jars/visualization_methods/
```

In default `local` mode, start the backend from `analyticsframework` and supply
trusted compatible JARs in those directories before startup. Startup discovers
local analytics methods and visualization libraries. A catalog can be present
while execution fails if its recorded JAR is missing.

When reusing a database, restore the exact recorded filenames and versions.
Legacy paths such as `./jars/analytics_techniques/example.jar` are relative to the
backend's working directory; changing `DATA_DIR` alone does not relocate these
recorded paths. Runtime loaders use the recorded JAR rather than searching another
version for a matching class.

Local upload routes preserve an existing filename, including a symlink, and return
HTTP 409 (`PLUGIN_FILE_EXISTS`) instead of overwriting it. Atomic local publication
requires a filesystem that supports same-directory hard links; unsupported
filesystems fail without replacing existing data.

In `s3` mode, a content-addressed artifact registry and verified per-backend cache
resolve plugin bytes. Startup verifies installed artifacts, skips local discovery
and blocks legacy local mutations. An unavailable or corrupt object does not
cause fallback to a different local JAR. Configure the provider and explicitly
migrate an existing catalog before switching its storage mode.

Super-admins use **Add methods** or **Add library** to upload, inspect, review and
activate plugins in S3 mode. Inspection requires confirmation of a trusted source
before constructors execute; archive validation does not sandbox uploaded code.
Uploads are limited to 100 MiB, expanded archives to 256 MiB and archive entries to
10000. Invalid archives return `INVALID_PLUGIN_JAR`. Incomplete installations stay
hidden until activation completes; identical uploads are idempotent.

**Details & versions** edits metadata with revision checks. **Upload new version**
creates an explicit old-to-new mapping and separate immutable catalog IDs; previous
versions remain executable for saved indicators. **Disable** retires an entry from
new selections while keeping saved work usable. Legacy DELETE routes return HTTP
409 (`PLUGIN_DELETE_UNAVAILABLE`); dependency-safe removal, recovery and artifact
cleanup use the dedicated management workflow and their deployment gates.

| Guide | Details |
| --- | --- |
| [Artifact migration](plugin-artifact-migration.md) | Storage settings, inventory/check/apply and recovery |
| [Upload workflow](plugin-upload-workflow.md) | Supported contracts, inspection, activation and resumable reviews |
| [Version management](plugin-version-management.md) | Metadata, version mappings and concurrency |
| [Removal and retention](plugin-removal-and-retention.md) | Reference checks, recovery windows and explicit cleanup gates |
| [Versity storage](plugin-storage-versity.md) | S3 provider configuration and qualification |

## Error responses and request tracing

API errors use a common envelope. For example, request validation can return:

```json
{
  "timestamp": "2026-06-25T20:31:08.082Z",
  "status": 400,
  "error": "BAD_REQUEST",
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed.",
  "path": "/api/v1/register",
  "traceId": "6bbd5bf6-d3c3-4a85-872b-bde905aab69a",
  "details": {
    "fieldErrors": [{ "field": "email", "message": "Email is mandatory" }]
  }
}
```

Every request receives a correlation ID. Supply `X-Request-Id` or
`X-Correlation-Id`, or let the server generate one. The response's `X-Request-Id`
header, error `traceId` and server logs use the same identifier.

`API_ERROR_LEGACY_COMPAT=true` is the default and adds the legacy `httpStatus` and
`errors` aliases. Clients should use the HTTP status, stable `code` and actionable
`message`; `details` depends on the validation or business error. Exception causes
and stack traces stay in server logs, not response payloads.

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

To import the original homepage content, first start the database using the
[local installation guide](../README.md#local-installation). Run the import before
editing or publishing these entries. Back up an existing target database and keep
content editing disabled during the migration.

From `analyticsframework`:

```bash
./mvnw -q -DskipTests compile \
  exec:java \
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
  exec:java \
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

Content endpoints return `details.fieldErrors` as a map from field names to actionable
messages. Global request validation, including the registration example above, returns
an array of `{ "field", "message" }` objects instead.

Content validation limits:
title 300 characters; news body 30000 text characters (a hard break counts as one character),
2000 rich-text nodes, and depth 12 (legacy arrays allow 500 parts); news venue 1000;
publication authors/venue 2000 each; URLs 2048; publication year 1000–2999. All validation is
enforced on the backend as well as in the editor.

## Focused backend checks

Run the complete unit suite and package the application:

```bash
./mvnw package
```

Database wiring tests need no running MongoDB server:

```bash
./mvnw -Dtest=MongoWiringTest test
```

They cover primary/default injection, separate clients and templates, repository
bindings, shared-server connections, explicit database-name precedence and blank
name rejection. The clients use closed loopback ports and perform no database
operations.

For the plugin integration fixture, which creates disposable MongoDB and object
storage resources:

```bash
python3 scripts/test-plugin-artifacts.py
```

See [content management testing](content-management-testing.md) for the editor's
manual checks. Startup and troubleshooting are covered in the
[project README](../README.md#local-installation).
