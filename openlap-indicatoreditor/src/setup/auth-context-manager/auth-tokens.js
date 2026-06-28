// Pure, environment-free helpers for working with JWT auth tokens.
//
// Kept separate from the AuthProvider so they can be unit-tested without React
// or a DOM, and so token parsing never throws into render/interceptor code.

import { jwtDecode } from "jwt-decode";

/**
 * Decode a JWT payload without ever throwing. A malformed/garbage token must
 * never crash app startup or an interceptor — callers get `null` instead.
 * @param {string|undefined|null} token
 * @returns {object|null}
 */
export const safeDecode = (token) => {
  try {
    return token ? jwtDecode(token) : null;
  } catch {
    return null;
  }
};

/**
 * Whether an access token is expired (or unusable). Returns `true` when the
 * token is missing, cannot be decoded, or has no numeric `exp`, so callers
 * treat "can't tell" as "needs refresh" rather than trusting a bad token.
 *
 * `skewSeconds` adds a small tolerance so a token that expires in the next few
 * seconds is considered already expired — avoids racing the boundary.
 *
 * @param {string|undefined|null} token
 * @param {number} [skewSeconds=0]
 * @returns {boolean}
 */
export const isTokenExpired = (token, skewSeconds = 0) => {
  const decoded = safeDecode(token);
  if (!decoded || typeof decoded.exp !== "number") return true;
  const nowSeconds = Date.now() / 1000;
  return decoded.exp <= nowSeconds + skewSeconds;
};
