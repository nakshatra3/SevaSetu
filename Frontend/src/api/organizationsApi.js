import { http } from "./httpClient";

// Short list of organizations (for dropdowns). params: { q, verified_only }
export const listOrganizations = (params) => http.get("/organizations", { params });

export const getMyOrganization = () => http.get("/organizations/me");

export const getMyOrganizationStats = () => http.get("/organizations/me/stats");

export const updateMyOrganization = (data) => http.put("/organizations/me", data);

export const getOrganization = (id) => http.get(`/organizations/${id}`);

// details: { note, registration_number } (kept private: only admins see them)
export const requestVerification = (details) => http.post("/organizations/me/verification-request", details);
