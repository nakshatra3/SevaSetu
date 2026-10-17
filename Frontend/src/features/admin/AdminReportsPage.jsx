import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listReports, updateReport } from "@/api/adminApi";
import { REPORT_REASONS, REPORT_STATUS } from "@/config/constants";
import { timeAgo } from "@/utils/format";

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label || value;
const TONES = { open: "warning", resolved: "success", dismissed: "neutral" };

// Link to the reported profile where one exists. Extend for events in Part B.
function targetLink(report) {
  if (report.target_type === "organization") return `/app/organizations/${report.target_id}`;
  return null;
}

export default function AdminReportsPage() {
  useDocumentTitle("Reports");
  const [status, setStatus] = useState(REPORT_STATUS.OPEN);
  const [note, setNote] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data, loading, error, reload, setData } = useApiData(() => listReports({ status }), [status]);

  const act = async (report, decision) => {
    setBusyId(report.id);
    setActionError("");
    try {
      const updated = await updateReport(report.id, decision, note[report.id] || "");
      setData((prev) => (status ? prev.filter((r) => r.id !== report.id) : prev.map((r) => (r.id === report.id ? { ...r, ...updated } : r))));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Reports" subtitle="Reports filed by volunteers and organizations." />
      <div className="filters">
        <FormField as="select" label="Show" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All reports</option>
          {Object.values(REPORT_STATUS).map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </FormField>
      </div>
      <Alert type="error">{actionError}</Alert>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <ul className="review-list">
            {data.map((r) => (
              <li key={r.id} className="card stack">
                <div className="row row--between">
                  <div className="row">
                    <h3>
                      {targetLink(r) ? <Link to={targetLink(r)}>{r.target_label}</Link> : r.target_label}
                    </h3>
                    <Badge tone={TONES[r.status]}>{r.status}</Badge>
                  </div>
                  <small className="muted">{timeAgo(r.created_at)}</small>
                </div>
                <p><strong>{reasonLabel(r.reason)}</strong> · reported by {r.reporter_name} · {r.target_type}</p>
                {r.details && <p>{r.details}</p>}
                {r.status === REPORT_STATUS.OPEN ? (
                  <>
                    <FormField label="Note (optional)" value={note[r.id] || ""} onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))} />
                    <div className="row">
                      <Button size="sm" loading={busyId === r.id} onClick={() => act(r, REPORT_STATUS.RESOLVED)}>Mark resolved</Button>
                      <Button size="sm" variant="secondary" disabled={busyId === r.id} onClick={() => act(r, REPORT_STATUS.DISMISSED)}>Dismiss</Button>
                    </div>
                  </>
                ) : (
                  r.resolution_note && <p className="muted">Note: {r.resolution_note}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reports here">Nothing needs your attention for this filter.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}
