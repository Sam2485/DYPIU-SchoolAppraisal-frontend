import apiClient from "./client";

export const fetchUsers = () => apiClient.get("/api/users");

export const createUser = (payload) => apiClient.post("/api/users", payload);

export const updateUser = (userId, payload) => apiClient.put(`/api/users/${encodeURIComponent(userId)}`, payload);

export const deleteUser = (userId) => apiClient.delete(`/api/users/${encodeURIComponent(userId)}`);

