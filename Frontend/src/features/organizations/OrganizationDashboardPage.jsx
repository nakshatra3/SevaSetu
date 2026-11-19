import { Link } from "react-router-dom";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import QueryState from "@/components/common/QueryState";
import VerificationBadge from "@/features/verification/VerificationBadge";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getMyOrganizationStats } from "@/api/organizationsApi";
import { getMyEvents } from "@/api/eventsApi";
import { formatDateTime } from "@/utils/format";

export default function OrganizationDashboardPage() {
  useDocumentTitle("Organizer dashboard");
  const stats = useApiData(getMyOrganizationStats, []);
  const events = useApiData(getMyEvents, []);
  const upcoming = (events.data || []).filter((e) => ["upcoming", "ongoing"].includes(e.status)).reverse();

  return (
    <div className="stack stack--lg">
      <QueryState loading={stats.loading} error={stats.error} onRetry={stats.reload}>
        {stats.data && (
          <>
            <PageHeader
              title={stats.data.organization_name}
              subtitle={<VerificationBadge status={stats.data.verification_status} />}
              actions={<Link className="btn btn--primary" to="/app/organization/events/new">Post an event</Link>}
            />
            {stats.data.verification_status !== "verified" && (
              <div className="card row row--between">
                <p>Verified organizations get more volunteers. Complete your profile and request verification.</p>
                <Link className="btn btn--secondary btn--sm" to="/app/organization/profile">Go to profile</Link>
              </div>
            )}
            <div className="stats">
              <div className="stat"><strong>{stats.data.upcoming_events}</strong><span>upcoming events</span></div>
              <div className="stat"><strong>{stats.data.active_registrations}</strong><span>active registrations</span></div>
              <div className="stat"><strong>{stats.data.volunteers_engaged}</strong><span>volunteers engaged</span></div>
              <div className="stat"><strong>{stats.data.hours_delivered}</strong><span>verified hours</span></div>
              <Link to="/app/donations" className={`stat stat--link ${stats.data.pending_donations ? "stat--attention" : ""}`}>
                <strong>{stats.data.pending_donations}</strong><span>donations to verify</span>
              </Link>
              <div className="stat"><strong>{stats.data.rating_count ? stats.data.rating_average.toFixed(1) : "-"}</strong><span>rating ({stats.data.rating_count} reviews)</span></div>
            </div>
          </>
        )}
      </QueryState>

      <section className="stack">
        <div className="row row--between">
          <h2>Next events</h2>
          <Link to="/app/organization/events">All my events</Link>
        </div>
        <QueryState loading={events.loading} error={events.error} onRetry={events.reload}>
          {upcoming.length ? (
            <ul className="list card">
              {upcoming.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <span>
                    <Link to={`/app/organization/events/${e.id}/manage`}>{e.title}</Link>{" "}
                    <StatusBadge kind="event" status={e.status} />
                  </span>
                  <span className="muted">{formatDateTime(e.start_time)} · {e.registered_count}/{e.capacity} joined</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming events" action={<Link className="btn btn--primary" to="/app/organization/events/new">Post an event</Link>}>
              Post an event so volunteers can join.
            </EmptyState>
          )}
        </QueryState>
      </section>
    </div>
  );
}
