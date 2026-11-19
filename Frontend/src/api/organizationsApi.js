import { http } from "./httpClient";

export const listOrganizations = (params) => http.get("/organizations", { params });

export const getMyOrganization = () => http.get("/organizations/me");

export const getMyOrganizationStats = () => http.get("/organizations/me/stats");

export const updateMyOrganization = (data) => http.put("/organizations/me", data);

export const getOrganization = (id) => http.get(`/organizations/${id}`);

export const requestVerification = (details) => http.post("/organizations/me/verification-request", details);
