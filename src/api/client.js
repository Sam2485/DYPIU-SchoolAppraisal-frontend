import axios from "axios";

const runtimeApiBaseUrl = globalThis.__APP_CONFIG__?.VITE_API_BASE_URL;
const apiBaseUrl = runtimeApiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const loginPath = import.meta.env.MODE === "vm" ? "/AAA/login" : "/login";

const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

const setSessionValue = (key, value) => {
  const strVal = value == null ? "" : String(value);
  sessionStorage.setItem(key, strVal);
  localStorage.setItem(key, strVal);
};

const normalizeRoleValue = (value = "") => String(value).trim().toLowerCase().replaceAll("_", "-");

const normalizeListValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const decodeJwtPayload = (token = "") => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4), "=");
    return JSON.parse(atob(paddedPayload));
  } catch {
    return {};
  }
};

const isJwtExpired = (token = "") => {
  const { exp } = decodeJwtPayload(token);
  return typeof exp === "number" && exp * 1000 <= Date.now();
};

const storeUserProfile = (profile = {}) => {
  const rawRole = normalizeRoleValue(profile.role || "");
  const accountType = normalizeRoleValue(profile.accountType || (rawRole.includes("auditor") ? "auditor" : ""));
  const category = normalizeRoleValue(profile.category || "");
  const auditorType = normalizeRoleValue(profile.auditorType || "");
  const auditorRole = normalizeRoleValue(
    profile.auditorRole ||
    (accountType === "auditor" ? [category, auditorType, "auditor"].filter(Boolean).join("-") : rawRole)
  );
  const role = accountType === "auditor" ? auditorRole || rawRole : rawRole;
  const administrativePosts = normalizeListValue(
    profile.administrativePosts || profile.assignedPosts || profile.posts || profile.post
  );

  setSessionValue("userId", profile.id || profile.userId || "");
  setSessionValue("email", profile.email || profile.username || "");
  setSessionValue("username", profile.email || profile.username || "");
  setSessionValue("name", profile.name || profile.fullName || "");
  setSessionValue("designation", profile.designation || "");
  setSessionValue("school", profile.school || profile.schoolName || "");
  setSessionValue("post", profile.post || "");
  setSessionValue("administrativePosts", JSON.stringify(administrativePosts));
  setSessionValue("accountType", accountType);
  setSessionValue("category", category);
  setSessionValue("auditorType", auditorType);
  setSessionValue("auditorRole", auditorRole);
  setSessionValue("role", role);
  setSessionValue("academicYear", profile.academicYear || profile.currentAcademicYear || "");
};

const storeTokenSession = (accessToken, refreshToken) => {
  setSessionValue("token", accessToken);
  if (refreshToken) {
    setSessionValue("refreshToken", refreshToken);
  }
  apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

  const claims = decodeJwtPayload(accessToken);
  storeUserProfile({
    email: claims.email || claims.sub || claims.username,
    name: claims.name,
    designation: claims.designation,
    school: claims.school,
    role: claims.role,
    post: claims.post,
    currentAcademicYear: claims.currentAcademicYear,
    administrativePosts: claims.administrativePosts,
  });
};

export const clearAuthState = () => {
  sessionStorage.clear();
  localStorage.clear();
  delete apiClient.defaults.headers.common.Authorization;
};

const redirectToLogin = () => {
  if (globalThis.location?.pathname !== loginPath) {
    globalThis.location.replace(loginPath);
  }
};

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
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

const refreshAccessToken = async (storedRefreshToken) => {
  const res = await axios.post(`${apiBaseUrl}/api/auth/refresh`, {
    refreshToken: storedRefreshToken,
  });
  const newAccessToken = res.data?.token || res.data?.accessToken;
  if (!newAccessToken) {
    throw new Error("Refresh response is missing access token.");
  }

  const nextRefreshToken = res.data?.refreshToken || storedRefreshToken;
  storeTokenSession(newAccessToken, nextRefreshToken);
  return { token: newAccessToken, refreshToken: nextRefreshToken };
};

export const restoreAuthSession = async () => {
  const authKeys = [
    "token", "refreshToken", "userId", "email", "username", "name",
    "designation", "school", "post", "administrativePosts",
    "accountType", "category", "auditorType", "auditorRole", "role", "academicYear"
  ];
  authKeys.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, val);
    }
  });

  const sessionToken = sessionStorage.getItem("token") || localStorage.getItem("token");
  const sessionRole = sessionStorage.getItem("role") || localStorage.getItem("role");

  if (sessionToken && sessionRole && !isJwtExpired(sessionToken)) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${sessionToken}`;
    return true;
  }

  const storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
  if (!storedRefreshToken) return false;

  try {
    const { token } = await refreshAccessToken(storedRefreshToken);
    try {
      const profileResponse = await axios.get(`${apiBaseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      storeUserProfile(profileResponse.data?.data || profileResponse.data?.user || profileResponse.data || {});
    } catch {
      // A valid refresh token is enough to restore the session; profile fetches can retry in-page.
    }
    return true;
  } catch {
    clearAuthState();
    return false;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      const storedRefreshToken =
        sessionStorage.getItem("refreshToken") || localStorage.getItem("refreshToken");

      if (!storedRefreshToken) {
        clearAuthState();
        redirectToLogin();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { token: newAccessToken } = await refreshAccessToken(storedRefreshToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthState();
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
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

