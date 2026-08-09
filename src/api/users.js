import apiClient from "./client";

export const fetchUsers = () => apiClient.get("/api/users");

export const createUser = (payload) => apiClient.post("/api/users", payload);

export const updateUser = (userId, payload) => apiClient.put(`/api/users/${encodeURIComponent(userId)}`, payload);

export const deleteUser = (userId) => apiClient.delete(`/api/users/${encodeURIComponent(userId)}`);

export const fetchCurrentUser = () => apiClient.get("/api/users/me");

export const updateCurrentUser = (payload) => apiClient.put("/api/users/me", payload);

export const uploadCurrentUserAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const { data } = await apiClient.post("/api/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const uploaded = data?.data || data || {};
  return uploaded.avatarUrl || uploaded.url || "";
};

