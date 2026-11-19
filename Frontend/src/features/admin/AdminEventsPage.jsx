import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listAllEvents } from "@/api/adminApi";
import { cancelEvent } from "@/api/eventsApi";
import { formatDateTime } from "@/utils/format";

export default function AdminEventsPage() {
  useDocumentTitle("All events");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload, setData } = useApiData(() => listAllEvents({ q: debounced, status }), [debounced, status]);

  const cancel = async (event) => {
    if (!window.confirm(`Cancel "${event.title}"? Registered volunteers will be notified.`)) return;
    setActionError("");
    try {
      const updated = await cancelEvent(event.id);
      setData((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Events" subtitle="All events, including past and cancelled ones." />
      <div className="filters">
        <FormField label="Search" placeholder="Event title" value={search} onChange={(e) => setSearch(e.target.value)} />
        <FormField as="select" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </FormField>
      </div>
      <Alert type="error">{actionError}</Alert>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <div className="table-wrap card">
            <table className="table">
              <thead><tr><th>Event</th><th>Organization</th><th>When</th><th>Status</th><th>Registered</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id}>
                    <td><Link to={`/app/opportunities/${e.id}`}>{e.title}</Link><br /><small className="muted">{e.category} · {e.city}</small></td>
                    <td><Link to={`/app/organizations/${e.organization_id}`}>{e.organization_name}</Link></td>
                    <td>{formatDateTime(e.start_time)}</td>
                    <td><StatusBadge kind="event" status={e.status} /></td>
                    <td>{e.registered_count}/{e.capacity}</td>
                    <td className="cell-actions">
                      {["upcoming", "ongoing"].includes(e.status) && <Button size="sm" variant="danger" onClick={() => cancel(e)}>Cancel event</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No events found">Try another search.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}
