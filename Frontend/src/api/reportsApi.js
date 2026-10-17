import { http } from "./httpClient";
import { env } from "@/config/env";
import * as mock from "./mock/mockDb";

// payload: { target_type: "user"|"organization"|"event", target_id, reason, details }
export const createReport = (payload) =>
  env.USE_MOCK_DATA ? mock.createReport(payload) : http.post("/reports", payload);
