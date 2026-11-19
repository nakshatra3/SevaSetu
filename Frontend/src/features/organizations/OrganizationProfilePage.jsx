import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import TagList from "@/components/ui/TagList";
import QueryState from "@/components/common/QueryState";
import { StarRating } from "@/components/reviews/RatingReview";
import VerificationBadge from "@/features/verification/VerificationBadge";
import ReportDialog from "@/features/verification/ReportDialog";
import ReviewsSection from "@/features/reviews/ReviewsSection";
import OrganizationProfileForm from "./OrganizationProfileForm";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getMyOrganization, getOrganization, requestVerification, updateMyOrganization } from "@/api/organizationsApi";
import { REPORT_TARGETS, ROLES, VERIFICATION_STATUS } from "@/config/constants";
import { formatDate } from "@/utils/format";

export default function OrganizationProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isOwn = !id;
  useDocumentTitle(isOwn ? "Organization profile" : "Organization");

  const { data: org, loading, error, reload, setData } = useApiData(
    () => (isOwn ? getMyOrganization() : getOrganization(id)),
    [id]
  );
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [askingVerification, setAskingVerification] = useState(false);
  const [notice, setNotice] = useState("");

  const save = async (values) => {
    const updated = await updateMyOrganization(values);
    setData(updated);
    setEditing(false);
    setNotice("Organization profile saved.");
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
                <>
                  {user.role === ROLES.VOLUNTEER && (
                    <Link className="btn btn--primary" to={`/app/donations?organization=${org.id}`}>Donate</Link>
                  )}
                  <Button variant="ghost" onClick={() => setReporting(true)}>Report</Button>
                </>
              )
            }
          />

          <div className="row">
            <VerificationBadge status={org.verification_status} />
            {org.rating_count ? (
              <span className="row">
                <StarRating rating={org.rating_average} readOnly size="sm" />
                <span className="muted">{org.rating_average.toFixed(1)} from {org.rating_count} reviews</span>
              </span>
            ) : (
              <span className="muted">No ratings yet</span>
            )}
          </div>

          {notice && <Alert type="success">{notice}</Alert>}
          {isOwn && org.verification_status === VERIFICATION_STATUS.REJECTED && (
            <Alert type="warning">Verification was rejected. {org.verification_note || "Update your details and request it again."}</Alert>
          )}
          {isOwn && org.verification_status === VERIFICATION_STATUS.PENDING && (
            <Alert type="warning">Your verification request is waiting for an admin.</Alert>
          )}
          {canRequest && (
            <div className="card row row--between">
              <p>Verified organizations are shown with a badge, so volunteers can trust them.</p>
              <Button onClick={() => setAskingVerification(true)}>Request verification</Button>
            </div>
          )}

          <div className="stats">
            <div className="stat"><strong>{org.stats.events_hosted}</strong><span>events hosted</span></div>
            <div className="stat"><strong>{org.stats.volunteers_engaged}</strong><span>volunteers engaged</span></div>
            <div className="stat"><strong>{org.stats.hours_delivered}</strong><span>volunteer hours</span></div>
          </div>

          {editing ? (
            <OrganizationProfileForm org={org} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <section className="card stack">
                <h2>About</h2>
                <p className="prewrap">{org.description || <span className="muted">No description yet.</span>}</p>
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
                <h2>Events & activities</h2>
                {org.events.length ? (
                  <ul className="list">
                    {org.events.map((ev) => (
                      <li key={ev.id}>
                        <span>
                          <Link to={`/app/opportunities/${ev.id}`}>{ev.title}</Link> <span className="muted">· {ev.category}</span>
                        </span>
                        <span className="row">
                          <StatusBadge kind="event" status={ev.status} />
                          <span className="muted">{formatDate(ev.date)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No events yet">Events posted by this organization will appear here.</EmptyState>
                )}
              </section>
            </>
          )}

          <ReviewsSection target={{ organization_id: org.id }} title="What volunteers say" onReviewAdded={() => reload({ silent: true })} />

          {!isOwn && (
            <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType={REPORT_TARGETS.ORGANIZATION} targetId={org.id} targetLabel={org.name} />
          )}
          {isOwn && (
            <VerificationDialog
              open={askingVerification}
              onClose={() => setAskingVerification(false)}
              onSent={(updated) => {
                setData(updated);
                setAskingVerification(false);
                setNotice("Verification requested. An admin will review your organization.");
              }}
            />
          )}
        </div>
      )}
    </QueryState>
  );
}

function VerificationDialog({ open, onClose, onSent }) {
  const [form, setForm] = useState({ registration_number: "", note: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      onSent(await requestVerification({ registration_number: form.registration_number.trim(), note: form.note.trim() }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Request verification">
      <form className="stack" onSubmit={submit} noValidate>
        <p className="muted">These details are private. Only platform admins can see them.</p>
        <Alert type="error">{error}</Alert>
        <FormField label="Registration number (NGO / trust / society)" maxLength={50} value={form.registration_number} onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))} />
        <FormField as="textarea" rows={4} label="Anything the admin should know" maxLength={1000} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        <div className="row row--end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Send request</Button>
        </div>
      </form>
    </Modal>
  );
}
