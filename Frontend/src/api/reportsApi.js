import { http } from "./httpClient";

// payload: { target_type: "user"|"organization"|"event", target_id, reason, details }
export const createReport = (payload) => http.post("/reports", payload);
