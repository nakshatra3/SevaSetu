import { Link } from "react-router-dom";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import EventCard from "@/components/events/EventCard";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getMyVolunteerProfile } from "@/api/volunteersApi";
import { getMyRegistrations } from "@/api/eventsApi";
import { getRecommendations } from "@/api/recommendationsApi";
import { formatDateTime } from "@/utils/format";

// Volunteer home: stats, upcoming events, top recommendations, latest badges.
export default function VolunteerDashboardPage() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const profile = useApiData(getMyVolunteerProfile, []);
  const upcoming = useApiData(() => getMyRegistrations("upcoming"), []);
  const recommended = useApiData(() => getRecommendations(3), []);

  return (
    <div className="stack stack--lg">
      <PageHeader title={`Hello, ${user.name.split(" ")[0]} 👋`} subtitle="Here's your volunteering at a glance." />

      <QueryState loading={profile.loading} error={profile.error} onRetry={profile.reload}>
        {profile.data && (
          <>
            <div className="stats">
              <div className="stat"><strong>{profile.data.total_hours}</strong><span>verified hours</span></div>
              <div className="stat"><strong>{profile.data.points}</strong><span>points</span></div>
              <div className="stat"><strong>{profile.data.completed_activities}</strong><span>activities done</span></div>
              <Link className="stat stat--link" to="/app/badges"><strong>{profile.data.achievements.length}</strong><span>badges</span></Link>
            </div>
            {profile.data.achievements.length > 0 && (
              <div className="row">
                {profile.data.achievements.slice(0, 5).map((b) => (
                  <span key={b.id} className="badge-chip" title={b.description}>{b.icon} {b.title}</span>
                ))}
              </div>
            )}
            {profile.data.referral_code && (
              <div className="card row row--between">
                <p>
                  Invite friends with your code <strong className="code">{profile.data.referral_code}</strong>. You get 25 points
                  when they complete their first activity.
                </p>
              </div>
            )}
          </>
        )}
      </QueryState>

      <section className="stack">
        <div className="row row--between">
          <h2>Your upcoming events</h2>
          <Link to="/app/volunteer/activities">See all activities</Link>
        </div>
        <QueryState loading={upcoming.loading} error={upcoming.error} onRetry={upcoming.reload}>
          {upcoming.data?.length ? (
            <ul className="list card">
              {upcoming.data.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link to={`/app/opportunities/${r.event.id}`}>{r.event.title}</Link>
                  <span className="muted">{formatDateTime(r.event.start_time)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming events" action={<Link className="btn btn--primary" to="/app/opportunities">Find an opportunity</Link>}>
              Join an event and it will show up here.
            </EmptyState>
          )}
        </QueryState>
      </section>

      <section className="stack">
        <div className="row row--between">
          <h2>Recommended for you</h2>
          <Link to="/app/recommendations">See all matches</Link>
        </div>
        <QueryState loading={recommended.loading} error={recommended.error} onRetry={recommended.reload}>
          {recommended.data?.results.length ? (
            <div className="card-grid">
              {recommended.data.results.map((event) => (
                <EventCard key={event.id} event={event} footer={<p className="match-line">Match score: <strong>{event.match.score}/100</strong></p>} />
              ))}
            </div>
          ) : (
            <EmptyState title="No recommendations yet">Add skills, interests and availability to your profile.</EmptyState>
          )}
        </QueryState>
      </section>
    </div>
  );
}
