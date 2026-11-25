import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cancelRegistration, getMyRegistrations } from "@/api/eventsApi";
import { formatDateTime } from "@/utils/format";

// Feature 5: upcoming and previous activities, with cancel.
export default function MyActivitiesPage() {
  useDocumentTitle("My activities");
  const [scope, setScope] = useState("upcoming");
  const { data, loading, error, reload } = useApiData(() => getMyRegistrations(scope), [scope]);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const cancel = async (registration) => {
    if (!window.confirm(`Cancel your registration for "${registration.event.title}"?`)) return;
    setBusyId(registration.id);
    setMessage({ type: "", text: "" });
    try {
      await cancelRegistration(registration.event.id);
      setMessage({ type: "success", text: "Registration cancelled. Your spot is free for someone else." });
      reload({ silent: true });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="My activities" subtitle="Events you joined, and your volunteering history." />
      <Tabs value={scope} onChange={setScope} options={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Previous" }]} />
      {message.text && <Alert type={message.type}>{message.text}</Alert>}

      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr><th>Event</th><th>When</th><th>Organization</th><th>Status</th><th>Hours</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td><Link to={`/app/opportunities/${r.event.id}`}>{r.event.title}</Link></td>
                    <td>{formatDateTime(r.event.start_time)}</td>
                    <td><Link to={`/app/organizations/${r.event.organization_id}`}>{r.event.organization_name}</Link></td>
                    <td>
                      {r.event.status === "cancelled" ? <StatusBadge kind="event" status="cancelled" /> : <StatusBadge kind="registration" status={r.status} />}
                    </td>
                    <td>{r.hours ?? "-"}</td>
                    <td className="cell-actions">
                      {scope === "upcoming" && r.event.status === "upcoming" && (
                        <Button variant="secondary" size="sm" loading={busyId === r.id} onClick={() => cancel(r)}>Cancel</Button>
                      )}
                      {scope === "upcoming" && r.event.status === "ongoing" && (
                        <Link className="btn btn--primary btn--sm" to={`/app/checkin?event=${r.event.id}`}>Check in</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={scope === "upcoming" ? "Nothing coming up" : "No previous activities"}
            action={<Link className="btn btn--primary" to="/app/opportunities">Find an opportunity</Link>}
          >
            {scope === "upcoming" ? "Join an event to see it here." : "Events you attended or cancelled appear here."}
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}
