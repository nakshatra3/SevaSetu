import { http } from "./httpClient";

export const getMyVolunteerProfile = () => http.get("/volunteers/me");

// data: { city, college, phone, bio, skills[], interests[], availability[], latitude, longitude }
export const updateMyVolunteerProfile = (data) => http.put("/volunteers/me", data);

export const getVolunteerProfile = (userId) => http.get(`/volunteers/${userId}`);
