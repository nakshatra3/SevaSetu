import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getMyPoints, listBadges } from "@/api/gamificationApi";
import { ROLES } from "@/config/constants";
import { formatDate } from "@/utils/format";

const RULE_LABELS = {
  events: "activities",
  hours: "hours",
  category_events: "activities",
  donations: "verified donations",
  referrals: "recruited volunteers",
  points: "points",
};

export default function BadgesPage() {
  useDocumentTitle("Badges & points");
  const { user } = useAuth();
  const isVolunteer = user.role === ROLES.VOLUNTEER;
  const badges = useApiData(listBadges, []);
  const points = useApiData(() => (isVolunteer ? getMyPoints() : Promise.resolve(null)), [isVolunteer]);

  return (
    <div className="stack stack--lg">
      <PageHeader title="Badges & points" subtitle="Earn badges for verified volunteering, donations and bringing friends along." />

      {isVolunteer && points.data && (
        <div className="stats">
          <div className="stat"><strong>{points.data.total_points}</strong><span>total points</span></div>
          <div className="stat"><strong>{points.data.total_hours}</strong><span>verified hours</span></div>
          <div className="stat"><strong>{(badges.data || []).filter((b) => b.earned).length}</strong><span>badges earned</span></div>
        </div>
      )}

      <QueryState loading={badges.loading} error={badges.error} onRetry={badges.reload}>
        <div className="badge-grid">
          {(badges.data || []).map((badge) => {
            const progress = Math.min(badge.progress ?? 0, badge.threshold);
            return (
              <article key={badge.id} className={`badge-card ${badge.earned ? "is-earned" : ""}`}>
                <div className="badge-card__icon" aria-hidden="true">{badge.icon}</div>
                <h3>{badge.name}</h3>
                <p className="muted">{badge.description}</p>
                {badge.categories?.length > 0 && <small className="muted">Categories: {badge.categories.join(", ")}</small>}
                {isVolunteer &&
                  (badge.earned ? (
                    <p className="text-success">Earned on {formatDate(badge.earned_at)}</p>
                  ) : (
                    <>
                      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={badge.threshold} aria-valuenow={progress}>
                        <span style={{ width: `${(progress / badge.threshold) * 100}%` }} />
                      </div>
                      <small className="muted">{progress} / {badge.threshold} {RULE_LABELS[badge.rule_type]}</small>
                    </>
                  ))}
                {!isVolunteer && <small className="muted">{badge.holders} volunteers have this badge</small>}
              </article>
            );
          })}
        </div>
      </QueryState>

      {isVolunteer && (
        <section className="card stack">
          <h2>How points work</h2>
          {points.data && (
            <ul className="bullets">
              <li>{points.data.rules.points_per_hour} points for every verified volunteering hour</li>
              <li>Money donations: {points.data.rules.money_donation}</li>
              <li>Books, clothes or food: {points.data.rules.item_donation}</li>
              <li>{points.data.rules.referral_points} points when a friend you invited completes their first activity</li>
            </ul>
          )}
          <h3>Points history</h3>
          <QueryState loading={points.loading} error={points.error} onRetry={points.reload}>
            {points.data?.history.length ? (
              <ul className="list">
                {points.data.history.map((h) => (
                  <li key={h.id}>
                    <span>{h.description}</span>
                    <span><strong>+{h.points}</strong> <small className="muted">{formatDate(h.created_at)}</small></span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No points yet">Join an event and check in to earn your first points.</EmptyState>
            )}
          </QueryState>
        </section>
      )}
    </div>
  );
}
