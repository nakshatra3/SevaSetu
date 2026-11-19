import { http } from "./httpClient";
export const getCheckinCode = (eventId) => http.get(`/attendance/events/${eventId}/code`);

export const checkIn = (eventId, code) => http.post("/attendance/checkin", { event_id: eventId, code });

export const verifyAttendance = (eventId, body) => http.post(`/attendance/events/${eventId}/verify`, body);
