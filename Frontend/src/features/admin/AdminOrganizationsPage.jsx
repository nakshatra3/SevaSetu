import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import VerificationBadge from "@/features/verification/VerificationBadge";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listOrganizations, reviewOrganization } from "@/api/adminApi";
import { VERIFICATION_LABELS, VERIFICATION_STATUS } from "@/config/constants";

export default function AdminOrganizationsPage() {
  useDocumentTitle("Organizations");
  const [status, setStatus] = useState(VERIFICATION_STATUS.PENDING);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data, loading, error, reload, setData } = useApiData(() => listOrganizations({ verification_status: status }), [status]);

  const review = async (org, decision) => {
    setBusyId(org.id);
    setActionError("");
    try {
      await reviewOrganization(org.id, decision);
      // Remove from the list if it no longer matches the current filter.
      setData((prev) => (status ? prev.filter((o) => o.id !== org.id) : prev.map((o) => (o.id === org.id ? { ...o, verification_status: decision } : o))));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Organizations" subtitle="Review verification requests." />
      <div className="filters">
        <FormField as="select" label="Show" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All organizations</option>
          {Object.values(VERIFICATION_STATUS).map((s) => (
            <option key={s} value={s}>{VERIFICATION_LABELS[s]}</option>
          ))}
        </FormField>
      </div>
      <Alert type="error">{actionError}</Alert>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <ul className="review-list">
            {data.map((org) => (
              <li key={org.id} className="card">
                <div className="stack">
                  <div className="row">
                    <h3><Link to={`/app/organizations/${org.id}`}>{org.name}</Link></h3>
                    <VerificationBadge status={org.verification_status} />
                  </div>
                  <p className="muted">{[org.city, org.contact_email].filter(Boolean).join(" · ")}</p>
                  {org.verification_note && <p>{org.verification_note}</p>}
                </div>
                {org.verification_status === VERIFICATION_STATUS.PENDING && (
                  <div className="row">
                    <Button size="sm" loading={busyId === org.id} onClick={() => review(org, VERIFICATION_STATUS.VERIFIED)}>Verify</Button>
                    <Button size="sm" variant="danger" disabled={busyId === org.id} onClick={() => review(org, VERIFICATION_STATUS.REJECTED)}>Reject</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing to review">No organizations match this filter.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}
