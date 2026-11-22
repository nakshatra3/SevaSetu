import { http } from "./httpClient";
export const getRecommendations = (limit = 10) => http.get("/recommendations", { params: { limit } });
