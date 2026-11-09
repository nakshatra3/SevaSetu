import { http } from "./httpClient";

// -> { profile_complete, results: [event + match: { score, breakdown, reasons, distance_km }] }
export const getRecommendations = (limit = 10) => http.get("/recommendations", { params: { limit } });
