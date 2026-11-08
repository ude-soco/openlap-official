import axios from "axios";

// Public content must not trigger login, refresh-token handling, or auth redirects.
const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "/api/",
  timeout: 15000,
});

export const requestPublicContent = async (kind, page, size, signal) => {
  const response = await client.get(`v1/content/${kind}`, {
    params: { page, size },
    signal,
  });
  return response.data.data;
};
