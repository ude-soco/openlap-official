import { createContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { safeDecode } from "./auth-tokens.js";
import {
  attachAuthInterceptors,
  createSingleFlight,
  shouldEndSession,
} from "./auth-refresh.js";

const AuthContext = createContext(undefined);

const BackendURL = import.meta.env.VITE_BACKEND_URL || "/api/";
const AuthTokens = "authTokens";
const SESSION_ISC = "session_isc";
const SESSION_INDICATOR = "session_indicator";

// Read the persisted tokens without throwing on corrupt JSON.
const readStoredTokens = () => {
  try {
    return JSON.parse(localStorage.getItem(AuthTokens)) || null;
  } catch {
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [authTokens, setAuthTokens] = useState(readStoredTokens);
  const [user, setUser] = useState(() => safeDecode(authTokens?.access_token));

  // Always-current view of the tokens, read inside the (single, stable) axios
  // interceptors. The interceptors are registered ONCE, so they must never
  // close over a render-captured `authTokens` value — they read this ref.
  const authTokensRef = useRef(authTokens);
  useEffect(() => {
    authTokensRef.current = authTokens;
  }, [authTokens]);

  const applyTokens = (tokens) => {
    authTokensRef.current = tokens;
    localStorage.setItem(AuthTokens, JSON.stringify(tokens));
    setAuthTokens(tokens);
    setUser(safeDecode(tokens?.access_token));
  };

  const clearSession = () => {
    authTokensRef.current = null;
    localStorage.removeItem(AuthTokens);
    setAuthTokens(null);
    setUser(null);
  };

  // Definitive end-of-session: refresh token is missing/expired/rejected. Shows
  // a single, clear reason before redirecting (only if a session actually
  // existed, so a plain unauthenticated visitor isn't nagged).
  const handleSessionExpired = () => {
    if (authTokensRef.current || readStoredTokens()) {
      enqueueSnackbar("Your session expired. Please log in again.", {
        variant: "info",
      });
    }
    clearSession();
    navigate("/login");
  };

  const login = async (email, password) => {
    try {
      const params = new URLSearchParams();
      params.append("userEmail", email);
      params.append("password", password);
      const response = await axios.post(BackendURL + "login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      applyTokens(response.data);
    } catch (error) {
      throw error.response;
    }
  };

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  // The real refresh. Critically it does NOT delete the stored tokens up-front,
  // and it only ends the session on a DEFINITIVE auth failure from the refresh
  // endpoint (the refresh token itself is invalid/expired). A transient error
  // (network blip, 5xx, timeout) leaves the session intact so the next request
  // can retry — previously ANY refresh error logged active users out.
  const performRefresh = async () => {
    const tokens = authTokensRef.current || readStoredTokens();
    if (!tokens?.refresh_token) {
      handleSessionExpired();
      return null;
    }
    try {
      const response = await axios.get(BackendURL + "v1/token/refresh", {
        headers: { Authorization: `Bearer ${tokens.refresh_token}` },
      });
      const newTokens = response.data?.data;
      if (!newTokens?.access_token) {
        handleSessionExpired();
        return null;
      }
      applyTokens(newTokens);
      return newTokens;
    } catch (error) {
      // Only a real rejection of the refresh token ends the session. Anything
      // else (no response, 5xx) keeps the user logged in for a later retry.
      if (shouldEndSession(error)) {
        handleSessionExpired();
      }
      return null;
    }
  };

  // `performRefresh` is recreated each render (closures over state); the
  // single-flight wrapper must be created ONCE and always call the latest one.
  const performRefreshRef = useRef(null);
  performRefreshRef.current = performRefresh;

  const refreshAccessTokenRef = useRef(null);
  if (!refreshAccessTokenRef.current) {
    refreshAccessTokenRef.current = createSingleFlight(() =>
      performRefreshRef.current()
    );
  }
  // Single-flight refresh shared by the response interceptor and any direct
  // caller (e.g. a role change that needs a fresh access token).
  const refreshAccessToken = refreshAccessTokenRef.current;

  // A SINGLE axios instance for the app's lifetime. Recreating it per render
  // (the previous behaviour) gave every consumer a new `api` identity, which
  // also made every `useEffect([api])` re-run on each auth change. Interceptors
  // are registered once, during creation, so they exist before any child's
  // mount effect fires its first request, and read live values via refs.
  const apiRef = useRef(null);
  if (!apiRef.current) {
    const instance = axios.create({ baseURL: BackendURL });
    attachAuthInterceptors(instance, {
      getAccessToken: () => authTokensRef.current?.access_token,
      refresh: refreshAccessToken,
    });
    apiRef.current = instance;
  }
  const api = apiRef.current;

  return (
    <AuthContext.Provider
      value={{
        authTokens,
        user,
        login,
        logout,
        refreshAccessToken,
        api,
        SESSION_ISC,
        SESSION_INDICATOR,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

export { AuthContext, AuthProvider };
