import axios from "axios";

const runtimeApiBaseUrl = globalThis.__APP_CONFIG__?.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: runtimeApiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data ||
  error?.message ||
  fallback;

export default apiClient;
