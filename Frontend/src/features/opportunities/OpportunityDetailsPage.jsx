import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import TagList from "@/components/ui/TagList";
import QueryState from "@/components/common/QueryState";
import EventsMap from "@/components/maps/EventsMap";
import ReportDialog from "@/features/verification/ReportDialog";
import ReviewsSection from "@/features/reviews/ReviewsSection";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cancelRegistration, getEvent, registerForEvent } from "@/api/eventsApi";
import { REPORT_TARGETS, ROLES } from "@/config/constants";
import { formatDateTime, formatHours, formatTime } from "@/utils/format";

export default function OpportunityDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: event, loading, error, reload, setData } = useApiData(() => getEvent(id), [id]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [reporting, setReporting] = useState(false);
  useDocumentTitle(event?.title || "Opportunity");

  const join = async () => {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const result = await registerForEvent(id);
      setData((prev) => ({ ...prev, ...result.event, my_registration_status: "registered" }));
      setNotice("You're registered! We'll remind you a day before.");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!window.confirm("Cancel your registration for this event?")) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const result = await cancelRegistration(id);
      setData((prev) => ({ ...prev, ...result.event, my_registration_status: "cancelled" }));
      setNotice("Your registration was cancelled.");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      {event && (
        <div className="stack stack--lg">
          <PageHeader
            title={event.title}
            subtitle={
              <>
                by <Link to={`/app/organizations/${event.organization_id}`}>{event.organization_name}</Link>
                {event.organization_verified && <span className="verified-tick"> ✔ Verified</span>}
              </>
            }
            actions={
              <>
                {event.is_owner && (
                  <Link className="btn btn--primary" to={`/app/organization/events/${event.id}/manage`}>Manage event</Link>
                )}
                {!event.is_owner && <Button variant="ghost" onClick={() => setReporting(true)}>Report</Button>}
              </>
            }
          />

          <div className="row">
            <Badge tone="info">{event.category}</Badge>
            <StatusBadge kind="event" status={event.status} />
            {event.my_registration_status && (
              <span className="row">You: <StatusBadge kind="registration" status={event.my_registration_status} /></span>
            )}
          </div>

          {notice && <Alert type="success">{notice}</Alert>}
          {actionError && <Alert type="error">{actionError}</Alert>}

          <div className="details-grid">
            <section className="card stack">
              <h2>About this opportunity</h2>
              <p className="prewrap">{event.description}</p>
              <h3>Skills that help</h3>
              <TagList items={event.skills_required} empty="No special skills needed." />
            </section>

            <aside className="card stack">
              <ul className="list">
                <li><span className="muted">When</span><span>{formatDateTime(event.start_time)} – {formatTime(event.end_time)}</span></li>
                <li><span className="muted">Duration</span><span>{formatHours(event.duration_hours)}</span></li>
                <li><span className="muted">Time slot</span><span>{event.time_slot}</span></li>
                <li><span className="muted">Where</span><span>{[event.address, event.city].filter(Boolean).join(", ")}</span></li>
                <li><span className="muted">Spots</span><span>{event.spots_left} left of {event.capacity}</span></li>
              </ul>

              {user.role === ROLES.VOLUNTEER && (
                <RegistrationButton event={event} busy={busy} onJoin={join} onLeave={leave} />
              )}
            </aside>
          </div>

          <EventsMap events={[event]} center={null} height={300} />

          <ReviewsSection target={{ event_id: event.id }} title="Reviews of this event" />

          <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType={REPORT_TARGETS.EVENT} targetId={event.id} targetLabel={event.title} />
        </div>
      )}
    </QueryState>
  );
}

function RegistrationButton({ event, busy, onJoin, onLeave }) {
  const status = event.my_registration_status;

  if (status === "attended") return <Alert type="success">You attended this event. Thank you! 🎉</Alert>;
  if (event.status === "cancelled") return <Alert type="warning">This event was cancelled.</Alert>;
  if (status === "registered") {
    return (
      <div className="stack">
        <Alert type="success">You're registered for this event.</Alert>
        {event.status === "upcoming" ? (
          <Button variant="secondary" loading={busy} onClick={onLeave}>Cancel my registration</Button>
        ) : (
          <Link className="btn btn--primary" to={`/app/checkin?event=${event.id}`}>Check in</Link>
        )}
      </div>
    );
  }
  if (event.status !== "upcoming") return <p className="muted">Registration is closed.</p>;
  if (event.spots_left === 0) return <Alert type="warning">This event is full.</Alert>;
  return <Button loading={busy} onClick={onJoin}>Join this event</Button>;
}
