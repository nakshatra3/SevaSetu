import { http } from "./httpClient";

// ----- Browse and search (Features 2, 3, 4) -----
// params: { q, category, city, date_from, date_to, min_hours, max_hours, skills,
//           time_slot, has_spots, lat, lng, radius_km, sort, include_past }
export const searchEvents = (params) => http.get("/events", { params });

export const getEvent = (id) => http.get(`/events/${id}`);

export const listCategories = () => http.get("/categories");

// ----- Organizer (Feature 6) -----
export const getMyEvents = () => http.get("/events/mine");
export const createEvent = (data) => http.post("/events", data);
export const updateEvent = (id, data) => http.put(`/events/${id}`, data);
export const cancelEvent = (id) => http.post(`/events/${id}/cancel`);
export const getParticipants = (id) => http.get(`/events/${id}/participants`);

// ----- Volunteer registration (Feature 5) -----
export const registerForEvent = (id) => http.post(`/events/${id}/register`);
export const cancelRegistration = (id) => http.post(`/events/${id}/cancel-registration`);

// scope: "upcoming" | "past" | "all"
export const getMyRegistrations = (scope = "all") => http.get("/registrations/me", { params: { scope } });
