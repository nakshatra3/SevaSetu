import { http } from "./httpClient";

export const searchEvents = (params) => http.get("/events", { params });

export const getEvent = (id) => http.get(`/events/${id}`);

export const listCategories = () => http.get("/categories");

export const getMyEvents = () => http.get("/events/mine");
export const createEvent = (data) => http.post("/events", data);
export const updateEvent = (id, data) => http.put(`/events/${id}`, data);
export const cancelEvent = (id) => http.post(`/events/${id}/cancel`);
export const getParticipants = (id) => http.get(`/events/${id}/participants`);

export const registerForEvent = (id) => http.post(`/events/${id}/register`);
export const cancelRegistration = (id) => http.post(`/events/${id}/cancel-registration`);

export const getMyRegistrations = (scope = "all") => http.get("/registrations/me", { params: { scope } });
