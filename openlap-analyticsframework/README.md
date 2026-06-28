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
