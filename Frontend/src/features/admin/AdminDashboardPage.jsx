import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getAdminStats } from "@/api/adminApi";

const CARDS = [
  { key: "pending_verifications", label: "Awaiting verification", to: "/app/admin/organizations", highlight: true },
  { key: "open_reports", label: "Open reports", to: "/app/admin/reports", highlight: true },
  { key: "total_users", label: "Total users", to: "/app/admin/users" },
  { key: "volunteers", label: "Volunteers", to: "/app/admin/users" },
  { key: "organizations", label: "Organizations", to: "/app/admin/organizations" },
  { key: "total_events", label: "Events", to: "/app/admin/events" },
  { key: "upcoming_events", label: "Upcoming events", to: "/app/admin/events" },
  { key: "registrations", label: "Registrations", to: "/app/admin/events" },
  { key: "verified_hours", label: "Verified volunteer hours", to: "/app/leaderboards" },
  { key: "points_awarded", label: "Points awarded", to: "/app/leaderboards" },
  { key: "badges_awarded", label: "Badges awarded", to: "/app/admin/badges" },
  { key: "donations", label: "Donations recorded" },
  { key: "verified_money_donated", label: "Money donated (verified, ₹)" },
  { key: "reviews", label: "Reviews" },
];

export default function AdminDashboardPage() {
  useDocumentTitle("Admin overview");
  const { data, loading, error, reload } = useApiData(getAdminStats, []);

  return (
    <div className="stack stack--lg">
      <PageHeader title="Platform overview" subtitle="Users, events, verification requests, reports and impact at a glance." />
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="stats stats--wide">
            {CARDS.map((card) =>
              card.to ? (
                <Link key={card.key} to={card.to} className={`stat stat--link ${card.highlight && data[card.key] > 0 ? "stat--attention" : ""}`}>
                  <strong>{data[card.key].toLocaleString("en-IN")}</strong>
                  <span>{card.label}</span>
                </Link>
              ) : (
                <div key={card.key} className="stat">
                  <strong>{data[card.key].toLocaleString("en-IN")}</strong>
                  <span>{card.label}</span>
                </div>
              )
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}
