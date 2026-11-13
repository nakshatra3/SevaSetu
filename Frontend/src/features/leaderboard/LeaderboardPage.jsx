import { useContext, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useApiData } from "@/hooks/useApiData";
import { listLeaderboard, confirmContribution } from "@/api/leaderboardApi";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import Button from "@/components/ui/Button";
import "./leaderboard.css";

export default function LeaderboardPage() {
  const { user } = useContext(AuthContext);
  const { data, loading, error, reload } = useApiData(listLeaderboard, []);
  const [eventId, setEventId] = useState("");
  const [volunteerId, setVolunteerId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const result = await confirmContribution(eventId.trim(), volunteerId.trim());
      setMessage(result.message);
      reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="stack stack--lg">
    <PageHeader title="Community leaderboard" subtitle="Small acts. Bigger impact." />
    <section className="impact-card">
      <h2>Every hour counts</h2>
      <p>Earn 10 points per confirmed event hour. More points move you up the leaderboard.</p>
      <p className="muted">Helping Hand: 0–49 · Changemaker: 50–199 · Community Hero: 200+</p>
      <small>All-time top 50 · Ties use hours, then volunteer ID · Only confirmed participants appear.</small>
    </section>
    {user?.role === "volunteer" && <p>Your volunteer ID: <code>{user.id}</code> — share it with your event organizer for confirmation.</p>}
    {user?.role === "organization" && <form onSubmit={confirm} className="impact-card stack">
      <h2>Confirm a contribution</h2>
      <p>After your event ends, confirm that this volunteer attended the full event. Use the event ID from the API and the volunteer’s account ID.</p>
      <label>Event ID<input required pattern="[a-fA-F0-9]{24}" value={eventId} onChange={e => setEventId(e.target.value)} /></label>
      <label>Volunteer ID<input required pattern="[a-fA-F0-9]{24}" value={volunteerId} onChange={e => setVolunteerId(e.target.value)} /></label>
      <Button type="submit" disabled={saving}>{saving ? "Confirming…" : "Confirm attendance"}</Button>
      <p role="status">{message}</p>
    </form>}
    <QueryState loading={loading} error={error} onRetry={reload}>
      {data?.length ? <div className="leaderboard-scroll"><table className="impact-table">
        <caption>Ranked by confirmed contribution points</caption>
        <thead><tr><th>Rank</th><th>Volunteer</th><th>Badge</th><th>Events</th><th>Hours</th><th>Points</th></tr></thead>
        <tbody>{data.map(row => <tr key={row.volunteer_id} className={row.volunteer_id === user?.id ? "impact-you" : ""}>
          <td>{row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : `#${row.rank}`}</td>
          <td>{row.name}{row.volunteer_id === user?.id ? " (you)" : ""}</td><td>{row.badge}</td>
          <td>{row.completed_events}</td><td>{row.hours}</td><td><strong>{row.points}</strong></td>
        </tr>)}</tbody>
      </table></div> : <section className="impact-card"><h2>No contributions yet</h2><p>Complete an event and ask its organizer to confirm your attendance.</p></section>}
    </QueryState>
  </div>;
}
