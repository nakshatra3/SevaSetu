import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUnreadCount } from "@/api/notificationsApi";

const POLL_MS = 60000; // swap for WebSocket/SSE later if you need real-time

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setCount(res.count);
    } catch {
      /* a failed poll should never disturb the page */
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("sevasetu:notifications-changed", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("sevasetu:notifications-changed", refresh);
    };
  }, [refresh]);

  return (
    <Link to="/app/notifications" className="bell" aria-label={count ? `Notifications, ${count} unread` : "Notifications"}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {count > 0 && <span className="bell__count">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
