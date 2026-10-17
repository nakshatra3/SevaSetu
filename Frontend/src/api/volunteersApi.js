import { http } from "./httpClient";
import { env } from "@/config/env";
import * as mock from "./mock/mockDb";

export const getMyVolunteerProfile = () =>
  env.USE_MOCK_DATA ? mock.getMyVolunteerProfile() : http.get("/volunteers/me");

export const updateMyVolunteerProfile = (data) =>
  env.USE_MOCK_DATA ? mock.updateMyVolunteerProfile(data) : http.put("/volunteers/me", data);

export const getVolunteerProfile = (id) =>
  env.USE_MOCK_DATA ? mock.getVolunteerProfile(id) : http.get(`/volunteers/${id}`);
