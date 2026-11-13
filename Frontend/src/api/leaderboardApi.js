import { http } from "./httpClient";

// Always use real backend scores, independently of the older mock-data setting.
export const listLeaderboard = () => http.get("/leaderboard");
export const confirmContribution = (eventId, volunteerId) =>
  http.put(`/contributions/${encodeURIComponent(eventId)}/${encodeURIComponent(volunteerId)}`);
