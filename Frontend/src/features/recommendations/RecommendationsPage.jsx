import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import EventCard from "@/components/events/EventCard";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getRecommendations } from "@/api/recommendationsApi";

// Must match WEIGHTS in Backend/app/utils/matching.py
const PARTS = [
  { key: "distance", label: "Distance", max: 30 },
  { key: "skills", label: "Skills", max: 25 },
  { key: "interests", label: "Interests", max: 20 },
  { key: "availability", label: "Availability", max: 15 },
  { key: "history", label: "Past activities", max: 10 },
];

// Feature 18: smart volunteer matching with a transparent score.
export default function RecommendationsPage() {
  useDocumentTitle("Recommended for you");
  const { data, loading, error, reload } = useApiData(() => getRecommendations(12), []);

  return (
    <div className="stack stack--lg">
      <PageHeader
        title="Recommended for you"
        subtitle="Each event gets a score out of 100 from your location, skills, interests, availability and past activities."
      />
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            {!data.profile_complete && (
              <Alert type="warning">
                Add your skills, interests and availability on <Link to="/app/volunteer/profile">your profile</Link> to get better matches.
              </Alert>
            )}
            {data.results.length ? (
              <div className="card-grid">
                {data.results.map((event) => (
                  <EventCard key={event.id} event={event} footer={<MatchDetails match={event.match} />} />
                ))}
              </div>
            ) : (
              <EmptyState title="No open events right now" action={<Link className="btn btn--primary" to="/app/opportunities">Browse all opportunities</Link>}>
                New events will be matched to you as organizations post them.
              </EmptyState>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
}

function MatchDetails({ match }) {
  return (
    <div className="match">
      <p className="match-line">
        Match score: <strong>{match.score}/100</strong>
      </p>
      <ul className="match-bars">
        {PARTS.map((part) => (
          <li key={part.key}>
            <span>{part.label}</span>
            <span className="progress progress--small">
              <span style={{ width: `${((match.breakdown[part.key] || 0) / part.max) * 100}%` }} />
            </span>
            <small>{match.breakdown[part.key] || 0}/{part.max}</small>
          </li>
        ))}
      </ul>
      {match.reasons.length > 0 && (
        <ul className="bullets bullets--small">
          {match.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
