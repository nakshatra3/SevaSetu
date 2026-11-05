import { http } from "./httpClient";
import { env } from "@/config/env";
import * as mock from "./mock/mockDb";

export const getMyOrganization = () =>
  env.USE_MOCK_DATA ? mock.getMyOrganization() : http.get("/organizations/me");

export const updateMyOrganization = (data) =>
  env.USE_MOCK_DATA ? mock.updateMyOrganization(data) : http.put("/organizations/me", data);

export const getOrganization = (id) =>
  env.USE_MOCK_DATA ? mock.getOrganization(id) : http.get(`/organizations/${id}`);

export const requestVerification = (note) =>
  env.USE_MOCK_DATA
    ? mock.requestVerification(note)
    : http.post("/organizations/me/verification-request", { note });
