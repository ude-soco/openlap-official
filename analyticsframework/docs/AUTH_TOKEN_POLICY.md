# Authentication Token Policy

This guide describes JWT token lifetimes, configuration and refresh behavior.

## Current policy

| Token | Lifetime | Issued by |
|-------|----------|-----------|
| Access token | **15 minutes** | login **and** refresh (same lifetime) |
| Refresh token | **5 days** | login |
| JWT verification leeway (clock skew) | **30 seconds** | token verification |

Both `/api/login` and `/api/v1/token/refresh` mint access tokens with the **same**
configured lifetime.

## Configuration

All values are externalized in `application.properties` (overridable by env var)
and read through `com.openlap.security.AuthTokenProperties`:

```properties
openlap.auth.access-token-ttl-minutes=${ACCESS_TOKEN_TTL_MINUTES:15}
openlap.auth.refresh-token-ttl-days=${REFRESH_TOKEN_TTL_DAYS:5}
openlap.auth.jwt-leeway-seconds=${JWT_LEEWAY_SECONDS:30}
```

There are no more hard-coded expiry magic numbers in the token-minting code.

## Refresh behaviour

- `/api/v1/token/refresh` accepts a valid **refresh token** in the
  `Authorization: Bearer <refresh_token>` header.
- It does **not** require a valid access token (the refresh path is exempt in the
  authorization filter and permitted in the security config).
- It returns a new short-lived access token and the **same** refresh token
  (no rotation).
- Disabled accounts cannot refresh tokens. Already-issued access tokens remain
  valid until expiry; account deactivation does not immediately revoke them.

## Error status

The status depends on the failing operation; rendered authentication errors use
the unified error envelope (`{ code, message, ... }`):

| Operation | Current response |
| --- | --- |
| Login rejected by `CustomAuthenticationFilter` | HTTP 401; HTTP 404 when the failure wraps `UserNotFoundException` |
| Missing authentication on a protected endpoint | HTTP 403 / `AUTH_REQUIRED` |
| Invalid or expired access token | HTTP 403 from `CustomAuthorizationFilter` |
| Authenticated user lacks permission | HTTP 403 / `ACCESS_DENIED` |
| Refresh-token verification or account check fails | HTTP 403 / `REFRESH_FAILED` |

See the [authentication filter](../src/main/java/com/openlap/security/filter/CustomAuthenticationFilter.java)
and [refresh controller](../src/main/java/com/openlap/user/controller/TokenController.java)
for the exact request/error paths. Consistent 401 versus 403 handling remains a
separate behavior change.

## Frontend expectation

The frontend refresh flow handles access-token expiry transparently: on a
401/403 it performs a single (de-duplicated) refresh, retries the original
request, and only ends the session if the refresh token itself is rejected.
Short access-token lifetimes are therefore invisible to active users.

## Current limitations

- Refresh-token **rotation**
- Server-side refresh-token **persistence / revocation**
- **Logout** revocation (logout is currently client-side only; a refresh token
  stays valid until its 5-day expiry)
- Consistent **401 vs 403** decision
- Configurable per-environment overrides beyond the three keys above
