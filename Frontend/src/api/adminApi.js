import { http } from "./httpClient";

export const getAdminStats = () => http.get("/admin/stats");

export const listUsers = (params) => http.get("/admin/users", { params });
export const setUserActive = (id, is_active) => http.patch(`/admin/users/${id}`, { is_active });

export const listOrganizations = (params) => http.get("/admin/organizations", { params });

export const reviewOrganization = (id, status, note = "") =>
  http.patch(`/admin/organizations/${id}/verification`, { status, note });

export const listReports = (params) => http.get("/admin/reports", { params });




export const updateReport = (id, status, resolution_note = "") =>
  http.patch(`/admin/reports/${id}`, { status, resolution_note });

export const listAllEvents = (params) => http.get("/admin/events", { params });

export const createCategory = (name) => http.post("/categories", { name });
export const deleteCategory = (id) => http.delete(`/categories/${id}`);
