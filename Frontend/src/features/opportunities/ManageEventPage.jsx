import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getParticipants } from "@/api/eventsApi";
import { getCheckinCode, verifyAttendance } from "@/api/attendanceApi";
import { formatDateTime, formatHours } from "@/utils/format";

export default function ManageEventPage() {
  const { id } = useParams();
  const location = useLocation();
  useDocumentTitle("Manage event");

  const { data, loading, error, reload } = useApiData(() => getParticipants(id), [id]);
  const { data: checkin } = useApiData(() => getCheckinCode(id), [id]);

  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="stack stack--lg">
          <PageHeader
            title={data.event.title}
            subtitle={`${formatDateTime(data.event.start_time)} · ${data.event.city}`}
            actions={
              <>
                <Link className="btn btn--ghost" to={`/app/opportunities/${id}`}>View public page</Link>
                {["upcoming", "ongoing"].includes(data.event.status) && (
                  <Link className="btn btn--secondary" to={`/app/organization/events/${id}/edit`}>Edit event</Link>
                )}
              </>
            }
          />
          {location.state?.notice && <Alert type="success">{location.state.notice}</Alert>}

          <div className="stats">
            <div className="stat"><strong>{data.event.registered_count}/{data.event.capacity}</strong><span>registered</span></div>
            <div className="stat"><strong>{data.participants.filter((p) => p.attended).length}</strong><span>attended</span></div>
            <div className="stat"><strong>{formatHours(data.event.duration_hours)}</strong><span>per volunteer</span></div>
            <div className="stat"><StatusBadge kind="event" status={data.event.status} /><span>status</span></div>
          </div>

          {checkin && data.event.status !== "cancelled" && <QrCard eventId={id} checkin={checkin} />}

          <ParticipantsTable eventId={id} event={data.event} participants={data.participants} onChanged={() => reload({ silent: true })} />
        </div>
      )}
    </QueryState>
  );
}

function QrCard({ eventId, checkin }) {
  const url = `${window.location.origin}/app/checkin?event=${eventId}&code=${checkin.code}`;
  return (
    <section className="card qr-card">
      <div className="qr-card__code">
        <QRCodeSVG value={url} size={180} includeMargin />
      </div>
      <div className="stack">
        <h2>QR check-in</h2>
        <p>Show this QR code at the event. Registered volunteers scan it to confirm attendance.</p>
        <p>
          Or they can type the code: <strong className="code">{checkin.code}</strong>
        </p>
        <p className="muted">
          Check-in is open from {formatDateTime(checkin.opens_at)} to {formatDateTime(checkin.closes_at)}.
          Keep this code private until the event.
        </p>
      </div>
    </section>
  );
}

function ParticipantsTable({ eventId, event, participants, onChanged }) {
  const [hours, setHours] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const canVerify = ["ongoing", "completed"].includes(event.status);

  const markPresent = async (p) => {
    setBusyId(p.volunteer_id);
    setMessage({ type: "", text: "" });
    try {
      const body = { volunteer_id: p.volunteer_id };
      if (hours[p.volunteer_id]) body.hours = Number(hours[p.volunteer_id]);
      const result = await verifyAttendance(eventId, body);
      setMessage({ type: "success", text: `${p.name}: ${result.hours} hours verified, ${result.points} points awarded.` });
      onChanged();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card stack">
      <h2>Participants</h2>
      {!canVerify && event.status !== "cancelled" && (
        <p className="muted">You can confirm attendance once the event has started (from 1 hour before).</p>
      )}
      {message.text && <Alert type={message.type}>{message.text}</Alert>}
      {participants.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Volunteer</th><th>Contact</th><th>Status</th><th>Hours</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.registration_id}>
                  <td><Link to={`/app/volunteers/${p.volunteer_id}`}>{p.name}</Link></td>
                  <td><small>{p.email}{p.phone && <><br />{p.phone}</>}</small></td>
                  <td><StatusBadge kind="registration" status={p.status} /></td>
                  <td>{p.attended ? `${p.hours} h (${p.check_in_method === "qr" ? "QR" : "organizer"})` : "-"}</td>
                  <td>
                    {p.status === "registered" && canVerify && (
                      <div className="row">
                        <input
                          className="input-sm"
                          type="number"
                          min="0.5"
                          step="0.5"
                          max={event.duration_hours}
                          placeholder={`${event.duration_hours} h`}
                          aria-label={`Hours for ${p.name}`}
                          value={hours[p.volunteer_id] || ""}
                          onChange={(e) => setHours((h) => ({ ...h, [p.volunteer_id]: e.target.value }))}
                        />
                        <Button size="sm" loading={busyId === p.volunteer_id} onClick={() => markPresent(p)}>Mark present</Button>
                      </div>
                    )}
                    {p.status === "attended" && <span className="text-success">✔ Verified</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No registrations yet">Volunteers who join will appear here.</EmptyState>
      )}
    </section>
  );
}
