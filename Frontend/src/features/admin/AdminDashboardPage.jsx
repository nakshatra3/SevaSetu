import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getAdminStats } from "@/api/adminApi";

// Add more cards here as platform features grow (events, donations, badges...).
const CARDS = [
  { key: "total_users", label: "Total users", to: "/app/admin/users" },
  { key: "volunteers", label: "Volunteers", to: "/app/admin/users" },
  { key: "organizations", label: "Organizations", to: "/app/admin/organizations" },
  { key: "pending_verifications", label: "Awaiting verification", to: "/app/admin/organizations", highlight: true },
  { key: "open_reports", label: "Open reports", to: "/app/admin/reports", highlight: true },
];

export default function AdminDashboardPage() {
  useDocumentTitle("Admin overview");
  const { data, loading, error, reload } = useApiData(getAdminStats, []);

  return (
    <div className="stack stack--lg">
      <PageHeader title="Platform overview" subtitle="Users, verification requests and reports at a glance." />
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="stats stats--wide">
            {CARDS.map((card) => (
              <Link key={card.key} to={card.to} className={`stat stat--link ${card.highlight && data[card.key] > 0 ? "stat--attention" : ""}`}>
                <strong>{data[card.key]}</strong>
                <span>{card.label}</span>
              </Link>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
