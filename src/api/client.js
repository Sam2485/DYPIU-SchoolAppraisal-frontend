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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken =
        sessionStorage.getItem("refreshToken") || localStorage.getItem("refreshToken");

      if (storedRefreshToken) {
        try {
          const baseUrl =
            runtimeApiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
          const res = await axios.post(`${baseUrl}/api/auth/refresh`, {
            refreshToken: storedRefreshToken,
          });
          const newAccessToken = res.data?.token || res.data?.accessToken;
          if (newAccessToken) {
            sessionStorage.setItem("token", newAccessToken);
            apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("refreshToken");
          localStorage.removeItem("refreshToken");
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data ||
  error?.message ||
  fallback;

export default apiClient;

