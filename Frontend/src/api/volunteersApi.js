import { http } from "./httpClient"
export const getMyVolunteerProfile = () => http.get("/volunteers/me");

export const updateMyVolunteerProfile = (data) => http.put("/volunteers/me", data);

export const getVolunteerProfile = (userId) => http.get(`/volunteers/${userId}`);
