import { http } from "./httpClient";

// Organizer only: the secret code shown as a QR code at the event.
export const getCheckinCode = (eventId) => http.get(`/attendance/events/${eventId}/code`);

// Volunteer: check in with the code from the QR.
export const checkIn = (eventId, code) => http.post("/attendance/checkin", { event_id: eventId, code });

// Organizer: mark a registered volunteer as present. body: { volunteer_id, hours?, feedback? }
export const verifyAttendance = (eventId, body) => http.post(`/attendance/events/${eventId}/verify`, body);
