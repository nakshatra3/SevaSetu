import { http } from "./httpClient";

// ----- Badges and points (Features 9, 11) -----
export const listBadges = () => http.get("/badges");
export const getMyPoints = () => http.get("/points/me");

// Admin: data = { name, description, icon, rule_type, threshold, categories[] }
export const createBadge = (data) => http.post("/badges", data);
export const updateBadge = (id, data) => http.put(`/badges/${id}`, data);
export const deleteBadge = (id) => http.delete(`/badges/${id}`);

// ----- Leaderboards (Feature 10) -----
// scope: "global" | "city" | "college" | "monthly" | "organization"
export const getLeaderboard = (scope, value = "") => http.get("/leaderboards", { params: { scope, value } });
export const getLeaderboardOptions = () => http.get("/leaderboards/options");
