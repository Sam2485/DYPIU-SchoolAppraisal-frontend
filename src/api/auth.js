import apiClient from "./client";

export const login = (username, password) =>
  apiClient.post("/api/auth/login", { username, password });

export const verifyOtp = (loginSessionId, otp) =>
  apiClient.post("/api/auth/verify-otp", { loginSessionId, otp });

export const resendOtp = (loginSessionId) =>
  apiClient.post("/api/auth/resend-otp", { loginSessionId });

export const requestPasswordReset = (email) =>
  apiClient.post("/api/auth/forgot-password", { email });

export const resetPassword = (token, newPassword) =>
  apiClient.post("/api/auth/reset-password", { token, newPassword });

export const refreshToken = (refreshToken) =>
  apiClient.post("/api/auth/refresh", { refreshToken });

export const logout = (refreshToken) =>
  apiClient.post("/api/auth/logout", { refreshToken });

