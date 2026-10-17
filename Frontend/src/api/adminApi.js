import { http } from "./httpClient";
import { env } from "@/config/env";
import * as mock from "./mock/mockDb";

export const getAdminStats = () =>
  env.USE_MOCK_DATA ? mock.getAdminStats() : http.get("/admin/stats");

export const listUsers = (params) =>
  env.USE_MOCK_DATA ? mock.listUsers(params) : http.get("/admin/users", { params });

export const setUserActive = (id, is_active) =>
  env.USE_MOCK_DATA
    ? mock.setUserActive(id, is_active)
    : http.patch(`/admin/users/${id}`, { is_active });

export const listOrganizations = (params) =>
  env.USE_MOCK_DATA ? mock.listAdminOrganizations(params) : http.get("/admin/organizations", { params });

// status: "verified" | "rejected"
export const reviewOrganization = (id, status, note = "") =>
  env.USE_MOCK_DATA
    ? mock.reviewOrganization(id, status, note)
    : http.patch(`/admin/organizations/${id}/verification`, { status, note });

export const listReports = (params) =>
  env.USE_MOCK_DATA ? mock.listReports(params) : http.get("/admin/reports", { params });

// status: "resolved" | "dismissed"
export const updateReport = (id, status, resolution_note = "") =>
  env.USE_MOCK_DATA
    ? mock.updateReport(id, status, resolution_note)
    : http.patch(`/admin/reports/${id}`, { status, resolution_note });
