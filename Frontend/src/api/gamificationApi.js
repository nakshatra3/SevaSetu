import { http } from "./httpClient";

export const listBadges = () => http.get("/badges");
export const getMyPoints = () => http.get("/points/me");

export const createBadge = (data) => http.post("/badges", data);
export const updateBadge = (id, data) => http.put(`/badges/${id}`, data);
export const deleteBadge = (id) => http.delete(`/badges/${id}`);

export const getLeaderboard = (scope, value = "") => http.get("/leaderboards", { params: { scope, value } });
export const getLeaderboardOptions = () => http.get("/leaderboards/options");
