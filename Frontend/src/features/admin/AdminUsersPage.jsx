import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listUsers, setUserActive } from "@/api/adminApi";
import { ROLE_LABELS } from "@/config/constants";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/format";

export default function AdminUsersPage() {
  useDocumentTitle("Users");
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload, setData } = useApiData(() => listUsers({ search: debounced, role }), [debounced, role]);

  const toggle = async (u) => {
    setBusyId(u.id);
    setActionError("");
    try {
      const updated = await setUserActive(u.id, !u.is_active);
      setData((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Users" subtitle="Search accounts and deactivate those that break the rules." />
      <div className="filters">
        <FormField label="Search" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <FormField as="select" label="Account type" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FormField>
      </div>
      <Alert type="error">{actionError}</Alert>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <div className="table-wrap card">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td>{u.organization_name || u.name}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABELS[u.role] || u.role}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td><Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Active" : "Deactivated"}</Badge></td>
                    <td className="cell-actions">
                      {u.id !== me.id && (
                        <Button variant={u.is_active ? "danger" : "secondary"} size="sm" loading={busyId === u.id} onClick={() => toggle(u)}>
                          {u.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No users match">Try a different name or account type.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}
