import { http } from "./httpClient";
import { env } from "@/config/env";
import * as mock from "./mock/mockDb";

export const listNotifications = () =>
  env.USE_MOCK_DATA ? mock.listNotifications() : http.get("/notifications");

export const getUnreadCount = () =>
  env.USE_MOCK_DATA
    ? mock.getUnreadCount()
    : http.get("/notifications/unread-count"); // -> { count: number }

export const markNotificationRead = (id) =>
  env.USE_MOCK_DATA ? mock.markNotificationRead(id) : http.post(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  env.USE_MOCK_DATA ? mock.markAllNotificationsRead() : http.post("/notifications/read-all");
