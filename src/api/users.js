import apiClient from "./client";

export const fetchUsers = () => apiClient.get("/api/users");

export const createUser = (payload) => apiClient.post("/api/users", payload);

