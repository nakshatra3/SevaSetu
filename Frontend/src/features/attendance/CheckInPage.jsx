import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { checkIn } from "@/api/attendanceApi";
import { getEvent, getMyRegistrations } from "@/api/eventsApi";
import { formatDateTime } from "@/utils/format";

// Feature 8: volunteer check-in.
// Scanning the organizer's QR code opens /app/checkin?event=<id>&code=<code>.
// Volunteers can also pick their event and type the code by hand.
export default function CheckInPage() {
  useDocumentTitle("Check in");
  const [searchParams] = useSearchParams();
  const [eventId, setEventId] = useState(searchParams.get("event") || "");
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Events I'm registered for (to choose from when there's no QR).
  const { data: registrations } = useApiData(() => getMyRegistrations("upcoming"), []);
  const { data: event } = useApiData(() => (eventId ? getEvent(eventId) : Promise.resolve(null)), [eventId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!eventId || !code.trim()) {
      setError("Choose your event and enter the check-in code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      setResult(await checkIn(eventId, code.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="stack stack--lg narrow">
        <PageHeader title="You're checked in! 🎉" />
        <div className="card stack">
          <p>
            Attendance for <strong>{result.event_title}</strong> is verified.
          </p>
          <div className="stats">
            <div className="stat"><strong>{result.hours}</strong><span>hours added</span></div>
            <div className="stat"><strong>+{result.points}</strong><span>points earned</span></div>
          </div>
          <div className="row">
            <Link className="btn btn--primary" to="/app/volunteer/profile">See my profile</Link>
            <Link className="btn btn--secondary" to="/app/badges">My badges</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack stack--lg narrow">
      <PageHeader title="Check in to an event" subtitle="Scan the organizer's QR code, or enter the 6-character code shown at the event." />
      <form className="card stack" onSubmit={submit} noValidate>
        <Alert type="error">{error}</Alert>
        {event && (
          <p>
            Event: <strong>{event.title}</strong> · {formatDateTime(event.start_time)}
          </p>
        )}
        {!searchParams.get("event") && (
          <FormField as="select" label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Choose one of your events</option>
            {(registrations || []).map((r) => (
              <option key={r.event.id} value={r.event.id}>
                {r.event.title} ({formatDateTime(r.event.start_time)})
              </option>
            ))}
          </FormField>
        )}
        <FormField label="Check-in code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder="e.g. 7KQ2MX" autoComplete="off" />
        <Button type="submit" loading={loading}>Confirm my attendance</Button>
      </form>
    </div>
  );
}
