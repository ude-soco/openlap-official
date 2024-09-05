import React, { createContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(undefined);

const BackendURL = import.meta.env.VITE_BACKEND_URL;

const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [authTokens, setAuthTokens] = useState(() => {
    const tokens = localStorage.getItem("authTokens");
    return tokens ? JSON.parse(tokens) : null;
  });

  const [user, setUser] = useState(() => {
    if (authTokens) {
      return jwtDecode(authTokens.access_token);
    }
    return null;
  });

  useEffect(() => {
    if (authTokens) {
      setUser(jwtDecode(authTokens.access_token));
    } else {
      setUser(null);
    }
  }, [authTokens]);

  const login = async (email, password) => {
    try {
      const params = new URLSearchParams();
      params.append("userEmail", email);
      params.append("password", password);
      const response = await axios.post(BackendURL + "login", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const tokens = response.data;
      setAuthTokens(tokens);
      setUser(jwtDecode(tokens.access_token));
      localStorage.setItem("authTokens", JSON.stringify(tokens));
    } catch (error) {
      throw error.response;
    }
  };

  const logout = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("authTokens");
    window.location.reload();
  };

  const refreshAccessToken = async () => {
    const tokens = JSON.parse(localStorage.getItem("authTokens"));
    if (!tokens) {
      navigate("/login");
    }
    try {
      localStorage.removeItem("authTokens");
      const response = await axios.get(BackendURL + "v1/token/refresh", {
        headers: {
          Authorization: `Bearer ${tokens.refresh_token}`,
        },
      });
      const newTokens = response.data.data;
      setAuthTokens(newTokens);
      setUser(jwtDecode(newTokens.access_token));
      localStorage.setItem("authTokens", JSON.stringify(newTokens));
      return newTokens;
    } catch (error) {
      logout(); // If refresh token fails, log out the user
      console.error("Session expired", error);
    }
  };

  const api = axios.create({
    baseURL: BackendURL,
  });

  api.interceptors.request.use(async (config) => {
    if (authTokens) {
      config.headers.Authorization = `Bearer ${authTokens.access_token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;
        const newTokens = await refreshAccessToken();
        if (newTokens) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return axios(originalRequest);
        }
      }
      return Promise.reject(error);
    },
  );

  return (
    <AuthContext.Provider
      value={{ authTokens, user, login, logout, refreshAccessToken, api }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
