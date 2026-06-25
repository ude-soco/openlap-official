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

   > **Why two compose files?** `compose.yaml` is the base (production-style)
   > configuration and intentionally does **not** expose the MongoDB port to the
   > host. `compose.dev.yaml` layers on local-development-only overrides — most
   > importantly publishing `27017:27017` so a host-run Spring Boot (and tools
   > like `mongosh`/Compass) can reach Mongo on `localhost`. Keeping them
   > separate means the base file stays safe to deploy as-is, while developers
   > opt in to the convenience overrides explicitly. Compose merges the files
   > left-to-right, so values in `compose.dev.yaml` win. (Compose does not
   > auto-discover `compose.dev.yaml`, so both `-f` flags are required.)

2. Build the project with the wrapper:

   ```bash
   ./mvnw clean package
   ```

3. Open this folder in **VS Code** and press **F5**
   (the **Run AnalyticsFramework (Spring Boot)** launch config starts the app with the debugger).

   Alternatively, run it from the terminal:

   ```bash
   ./mvnw spring-boot:run
   ```

4. The API is available at:

   ```
   http://localhost:8090/api
   ```

All endpoints are served under the **`/api`** context path (e.g. `http://localhost:8090/api/login`).

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
