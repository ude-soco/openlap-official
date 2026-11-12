# Authentication Token Policy

This note documents the JWT token policy after the Phase 1 cleanup. It is the
authoritative description of token lifetimes and where they are configured.

## Current policy

| Token | Lifetime | Issued by |
|-------|----------|-----------|
| Access token | **15 minutes** | login **and** refresh (same lifetime) |
| Refresh token | **5 days** | login |
| JWT verification leeway (clock skew) | **30 seconds** | token verification |

Both `/api/login` and `/api/v1/token/refresh` mint access tokens with the **same**
configured lifetime. (Previously login issued a 24-hour access token while
refresh issued a 10-minute one — that mismatch is removed.)

## Configuration

All values are externalized in `application.properties` (overridable by env var)
and read through `com.openlap.security.AuthTokenProperties`:

```properties
openlap.auth.access-token-ttl-minutes=${ACCESS_TOKEN_TTL_MINUTES:15}
openlap.auth.refresh-token-ttl-days=${REFRESH_TOKEN_TTL_DAYS:5}
openlap.auth.jwt-leeway-seconds=${JWT_LEEWAY_SECONDS:30}
```

There are no more hard-coded expiry magic numbers in the token-minting code.

## Refresh behaviour (unchanged this phase)

- `/api/v1/token/refresh` accepts a valid **refresh token** in the
  `Authorization: Bearer <refresh_token>` header.
- It does **not** require a valid access token (the refresh path is exempt in the
  authorization filter and permitted in the security config).
- It returns a new short-lived access token and the **same** refresh token
  (no rotation).

## Error status

All authentication/authorization failures (missing, invalid, or expired access
token; refresh failure; access denied) currently return **HTTP 403** with the
unified error envelope (`{ code, message, ... }`). The frontend tolerates both
401 and 403. Normalizing some of these to 401 is a deliberate later cleanup and
was **not** changed here.

## Frontend expectation

The frontend refresh flow handles access-token expiry transparently: on a
401/403 it performs a single (de-duplicated) refresh, retries the original
request, and only ends the session if the refresh token itself is rejected.
Short access-token lifetimes are therefore invisible to active users.

## Not implemented yet (future backend auth phase)

- Refresh-token **rotation**
- Server-side refresh-token **persistence / revocation**
- **Logout** revocation (logout is currently client-side only; a refresh token
  stays valid until its 5-day expiry)
- Consistent **401 vs 403** decision
- Configurable per-environment overrides beyond the three keys above
