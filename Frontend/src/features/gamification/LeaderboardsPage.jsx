import { useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getLeaderboard, getLeaderboardOptions } from "@/api/gamificationApi";

const SCOPES = [
  { value: "global", label: "Global" },
  { value: "monthly", label: "This month" },
  { value: "city", label: "City" },
  { value: "college", label: "College" },
  { value: "organization", label: "Organization" },
];

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardsPage() {
  useDocumentTitle("Leaderboards");
  const { user } = useAuth();
  const [scope, setScope] = useState("global");
  const [value, setValue] = useState("");
  const { data: options } = useApiData(getLeaderboardOptions, []);

  const changeScope = (next) => {
    setScope(next);
    if (next === "city") setValue(options?.my_city || options?.cities[0] || "");
    else if (next === "college") setValue(options?.my_college || options?.colleges[0] || "");
    else if (next === "organization") setValue(options?.organizations[0]?.id || "");
    else setValue("");
  };

  const needsValue = ["city", "college", "organization"].includes(scope);
  const ready = !needsValue || value;
  const { data, loading, error, reload } = useApiData(
    () => (ready ? getLeaderboard(scope, value) : Promise.resolve(null)),
    [scope, value, ready]
  );

  const choices = {
    city: (options?.cities || []).map((c) => ({ value: c, label: c })),
    college: (options?.colleges || []).map((c) => ({ value: c, label: c })),
    organization: (options?.organizations || []).map((o) => ({ value: o.id, label: o.name })),
  }[scope];

  return (
    <div className="stack stack--lg">
      <PageHeader title="Leaderboards" subtitle="Points come from verified hours, confirmed donations and recruiting volunteers." />
      <Tabs value={scope} onChange={changeScope} options={SCOPES} label="Leaderboard type" />

      {needsValue && (
        <div className="filters">
          <FormField as="select" label={SCOPES.find((s) => s.value === scope).label} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">{choices.length ? "Choose one" : "Nothing to choose yet"}</option>
            {choices.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </FormField>
        </div>
      )}

      {data?.my_rank && <p>You are ranked <strong>#{data.my_rank}</strong> here. Keep going!!!</p>}

      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.entries?.length ? (
          <div className="table-wrap card">
            <table className="table">
              <thead><tr><th>Rank</th><th>Volunteer</th><th>City</th><th>College</th><th>Hours</th><th>Points</th></tr></thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.user_id} className={e.user_id === user.id ? "is-me" : ""}>
                    <td><strong>{MEDALS[e.rank] || `#${e.rank}`}</strong></td>
                    <td><Link to={`/app/volunteers/${e.user_id}`}>{e.name}</Link>{e.user_id === user.id && " (you)"}</td>
                    <td>{e.city || "-"}</td>
                    <td>{e.college || "-"}</td>
                    <td>{e.hours}</td>
                    <td><strong>{e.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No rankings yet">Points appear here once volunteers complete verified activities.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}
