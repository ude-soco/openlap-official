import React, { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();

const BackendURL = import.meta.env.VITE_BACKEND_URL;

const AuthProvider = ({ children }) => {
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

  const login = async (userEmail, password) => {
    const params = new URLSearchParams();
    params.append("userEmail", userEmail);
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
  };

  const logout = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("authTokens");
  };

  const refreshAccessToken = async () => {
    const tokens = JSON.parse(localStorage.getItem("authTokens"));
    if (!tokens) return;

    try {
      const response = await axios.get(BackendURL + "v1/token/refresh", {
        headers: {
          Authorization: `Bearer ${tokens.refresh_token}`,
        },
      });

      const newTokens = response.data;
      setAuthTokens(newTokens);
      setUser(jwtDecode(newTokens.access_token));
      localStorage.setItem("authTokens", JSON.stringify(newTokens));
      return newTokens;
    } catch (error) {
      logout(); // If refresh token fails, log out the user
      console.error("Failed to refresh token", error);
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

      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const newTokens = await refreshAccessToken();
        if (newTokens) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return axios(originalRequest);
        }
      }
      return Promise.reject(error);
    }
  );

  return (
    <AuthContext.Provider value={{ authTokens, user, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
