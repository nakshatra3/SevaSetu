import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import TagList from "@/components/ui/TagList";
import QueryState from "@/components/common/QueryState";
import VerificationBadge from "@/features/verification/VerificationBadge";
import ReportDialog from "@/features/verification/ReportDialog";
import OrganizationProfileForm from "./OrganizationProfileForm";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getMyOrganization, getOrganization, requestVerification, updateMyOrganization } from "@/api/organizationsApi";
import { REPORT_TARGETS, VERIFICATION_STATUS } from "@/config/constants";
import { formatDate } from "@/utils/format";

// /app/organization/profile -> own organization (editable, can request verification)
// /app/organizations/:id    -> any organization (read-only, can report)
export default function OrganizationProfilePage() {
  const { id } = useParams();
  const isOwn = !id;
  useDocumentTitle(isOwn ? "Organization profile" : "Organization");

  const { data: org, loading, error, reload, setData } = useApiData(
    () => (isOwn ? getMyOrganization() : getOrganization(id)),
    [id]
  );
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const save = async (values) => {
    const updated = await updateMyOrganization(values);
    setData(updated);
    setEditing(false);
    setNotice("Organization profile saved.");
  };

  const askForVerification = async () => {
    setVerifying(true);
    setActionError("");
    try {
      setData(await requestVerification(""));
      setNotice("Verification requested. An admin will review your organization.");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const canRequest = org && isOwn && [VERIFICATION_STATUS.UNVERIFIED, VERIFICATION_STATUS.REJECTED].includes(org.verification_status);

  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      {org && (
        <div className="stack stack--lg">
          <PageHeader
            title={org.name}
            subtitle={[org.city, org.address].filter(Boolean).join(", ") || "Location not added yet"}
            actions={
              isOwn ? (
                !editing && <Button variant="secondary" onClick={() => { setNotice(""); setEditing(true); }}>Edit profile</Button>
              ) : (
                <Button variant="ghost" onClick={() => setReporting(true)}>Report</Button>
              )
            }
          />

          <div className="row">
            <VerificationBadge status={org.verification_status} />
            <span className="muted">
              {org.rating_count ? `${org.rating_average.toFixed(1)} rating from ${org.rating_count} reviews` : "No ratings yet"}
            </span>
          </div>

          {notice && <Alert type="success">{notice}</Alert>}
          {actionError && <Alert type="error">{actionError}</Alert>}
          {isOwn && org.verification_status === VERIFICATION_STATUS.REJECTED && (
            <Alert type="warning">Verification was rejected. {org.verification_note || "Update your details and request it again."}</Alert>
          )}
          {canRequest && (
            <div className="card row row--between">
              <p>Verified organizations are shown with a badge, so volunteers can trust them.</p>
              <Button onClick={askForVerification} loading={verifying}>Request verification</Button>
            </div>
          )}

          <div className="stats">
            <div className="stat"><strong>{org.stats.events_hosted}</strong><span>events hosted</span></div>
            <div className="stat"><strong>{org.stats.volunteers_engaged}</strong><span>volunteers engaged</span></div>
          </div>

          {editing ? (
            <OrganizationProfileForm org={org} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <section className="card stack">
                <h2>About</h2>
                <p>{org.description || <span className="muted">No description yet.</span>}</p>
                <h3>Focus areas</h3>
                <TagList items={org.categories} empty="No focus areas added." />
                <h3>Contact</h3>
                <ul className="list">
                  <li><span className="muted">Email</span><span>{org.contact_email || "-"}</span></li>
                  <li><span className="muted">Phone</span><span>{org.phone || "-"}</span></li>
                  <li>
                    <span className="muted">Website</span>
                    {org.website ? <a href={org.website} target="_blank" rel="noreferrer noopener">{org.website}</a> : <span>-</span>}
                  </li>
                </ul>
              </section>

              <section className="card stack">
                <h2>Events</h2>
                {/* Part B (Events) will replace this with a real event list. */}
                {org.events.length ? (
                  <ul className="list">
                    {org.events.map((ev) => (
                      <li key={ev.id}><strong>{ev.title}</strong><span className="muted">{formatDate(ev.date)}</span></li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No events yet">Events posted by this organization will appear here.</EmptyState>
                )}
              </section>
            </>
          )}

          {!isOwn && (
            <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType={REPORT_TARGETS.ORGANIZATION} targetId={org.id} targetLabel={org.name} />
          )}
          {isOwn && <p className="muted"><Link to="/app/notifications">View notifications</Link></p>}
        </div>
      )}
    </QueryState>
  );
}
