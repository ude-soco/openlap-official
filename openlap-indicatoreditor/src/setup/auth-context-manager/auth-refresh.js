// Framework-free auth-refresh primitives, extracted from AuthProvider so the
// concurrency-critical behaviour can be unit-tested without React or a DOM.
// Behaviour is identical to the inline logic it replaces — this is the single
// place the access-token refresh contract lives.

/**
 * Wrap an async task so that concurrent calls share ONE in-flight execution.
 * The underlying task runs once; every caller awaits the same promise. After it
 * settles (resolve OR reject) the lock clears so the next call starts fresh.
 *
 * This is what prevents an expired-token "thundering herd": when many requests
 * 401/403 at once they all await a single refresh instead of racing N of them.
 *
 * @template T
 * @param {(...args:any[]) => Promise<T>} task
 * @returns {(...args:any[]) => Promise<T>}
 */
export const createSingleFlight = (task) => {
  let inFlight = null;
  return (...args) => {
    if (!inFlight) {
      // `Promise.resolve().then(...)` so a synchronous throw in `task` becomes a
      // rejection (and still clears the lock) rather than escaping un-tracked.
      inFlight = Promise.resolve()
        .then(() => task(...args))
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
};

/**
 * Whether a FAILED refresh should end the session. Only a definitive rejection
 * of the refresh token (401/403) ends it; a transient error (no response /
 * network / timeout / 5xx) must NOT log an active user out — the next request
 * can retry.
 *
 * @param {any} error  an axios-style error
 * @returns {boolean}
 */
export const shouldEndSession = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

/**
 * Attach the auth request/response interceptors to an axios instance.
 *
 * - request: injects the current access token (read live via `getAccessToken`).
 * - response: on a 401/403 for a not-yet-retried request, runs `refresh` (which
 *   the caller has already single-flighted), then replays the original request
 *   ONCE with the new token. The `_retry` guard + the fact that `refresh` must
 *   not use this instance prevents any interceptor loop.
 *
 * @param {import('axios').AxiosInstance} instance
 * @param {{ getAccessToken: () => string|undefined,
 *           refresh: () => Promise<{access_token?:string}|null> }} deps
 * @returns {{ requestId:number, responseId:number }} interceptor ids (ejectable)
 */
export const attachAuthInterceptors = (instance, { getAccessToken, refresh }) => {
  const requestId = instance.interceptors.request.use((config) => {
    const access = getAccessToken();
    if (access) config.headers.Authorization = `Bearer ${access}`;
    return config;
  });

  const responseId = instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error?.config;
      const status = error?.response?.status;

      // No response (network/CORS/timeout) or a non-auth status: nothing to
      // refresh — surface the original error untouched. (Guarding `status` also
      // avoids dereferencing an undefined `error.response`.)
      if (
        !originalRequest ||
        (status !== 401 && status !== 403) ||
        originalRequest._retry
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const newTokens = await refresh();
      if (newTokens?.access_token) {
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return instance(originalRequest);
      }
      return Promise.reject(error);
    }
  );

  return { requestId, responseId };
};
