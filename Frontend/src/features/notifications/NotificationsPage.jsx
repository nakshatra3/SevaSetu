import { useState } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import Alert from "@/components/ui/Alert";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/notificationsApi";
import { timeAgo } from "@/utils/format";

// Tells the bell in the top bar to refetch its unread count.
const announceChange = () => window.dispatchEvent(new Event("sevasetu:notifications-changed"));

export default function NotificationsPage() {
  useDocumentTitle("Notifications");
  const { data, loading, error, reload, setData } = useApiData(listNotifications, []);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionError, setActionError] = useState("");

  const items = (data || []).filter((n) => !unreadOnly || !n.read);
  const unread = (data || []).filter((n) => !n.read).length;

  const markRead = async (id) => {
    setActionError("");
    try {
      await markNotificationRead(id);
      setData((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      announceChange();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const markAll = async () => {
    setActionError("");
    try {
      await markAllNotificationsRead();
      setData((prev) => prev.map((n) => ({ ...n, read: true })));
      announceChange();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setUnreadOnly((v) => !v)}>{unreadOnly ? "Show all" : "Show unread only"}</Button>
            <Button variant="secondary" size="sm" onClick={markAll} disabled={!unread}>Mark all as read</Button>
          </>
        }
      />
      <Alert type="error">{actionError}</Alert>

      <QueryState loading={loading} error={error} onRetry={reload}>
        {items.length ? (
          <ul className="notifications">
            {items.map((n) => (
              <li key={n.id} className={n.read ? "" : "is-unread"}>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small className="muted">{timeAgo(n.created_at)}</small>
                </div>
                {!n.read && <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>Mark as read</Button>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={unreadOnly ? "No unread notifications" : "No notifications yet"}>
            Reminders, registration updates and achievements will show up here.
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}
