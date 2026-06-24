import apiClient from "./client";

export const login = (username, password) =>
  apiClient.post("/api/auth/login", { username, password });

export const requestPasswordReset = (email) =>
  apiClient.post("/api/auth/forgot-password", { email });

export const resetPassword = (token, newPassword) =>
  apiClient.post("/api/auth/reset-password", { token, newPassword });
