import { http } from "./httpClient";
export const createReport = (payload) => http.post("/reports", payload);
