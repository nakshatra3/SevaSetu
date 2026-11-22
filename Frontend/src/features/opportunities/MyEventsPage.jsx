import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cancelEvent, getMyEvents } from "@/api/eventsApi";
import { formatDateTime } from "@/utils/format";

export default function MyEventsPage() {
  useDocumentTitle("My events");
  const { data: events, loading, error, reload, setData } = useApiData(getMyEvents, []);
  const [actionError, setActionError] = useState("");

  const cancel = async (event) => {
    if (!window.confirm(`Cancel "${event.title}"? Registered volunteers will be notified.`)) return;
    setActionError("");
    try {
      const updated = await cancelEvent(event.id);
      setData((prev) => prev.map((e) => (e.id === event.id ? { ...e, ...updated } : e)));
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        title="My events"
        subtitle="Manage schedules, capacity, participants and attendance."
        actions={<Link className="btn btn--primary" to="/app/organization/events/new">Post an event</Link>}
      />
      <Alert type="error">{actionError}</Alert>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {events?.length ? (
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr><th>Event</th><th>When</th><th>Status</th><th>Registered</th><th>Attended</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td><Link to={`/app/opportunities/${e.id}`}>{e.title}</Link><br /><small className="muted">{e.category} · {e.city}</small></td>
                    <td>{formatDateTime(e.start_time)}</td>
                    <td><StatusBadge kind="event" status={e.status} /></td>
                    <td>{e.registered_count} / {e.capacity}</td>
                    <td>{e.attended_count}</td>
                    <td className="cell-actions">
                      <div className="row row--end">
                        <Link className="btn btn--secondary btn--sm" to={`/app/organization/events/${e.id}/manage`}>Manage</Link>
                        {["upcoming", "ongoing"].includes(e.status) && (
                          <Link className="btn btn--ghost btn--sm" to={`/app/organization/events/${e.id}/edit`}>Edit</Link>
                        )}
                        {e.status === "upcoming" && (
                          <Button variant="danger" size="sm" onClick={() => cancel(e)}>Cancel</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No events yet" action={<Link className="btn btn--primary" to="/app/organization/events/new">Post your first event</Link>}>
            Create an event and volunteers can find and join it.
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}
