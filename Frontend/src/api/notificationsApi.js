import { http } from "./httpClient";

export const listNotifications = () => http.get("/notifications");

export const getUnreadCount = () => http.get("/notifications/unread-count"); // -> { count }

export const markNotificationRead = (id) => http.post(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => http.post("/notifications/read-all");
