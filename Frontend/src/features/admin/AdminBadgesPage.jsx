import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import TagInput from "@/components/ui/TagInput";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { createBadge, deleteBadge, listBadges, updateBadge } from "@/api/gamificationApi";

const RULES = [
  { value: "events", label: "Number of verified activities" },
  { value: "hours", label: "Verified volunteering hours" },
  { value: "category_events", label: "Activities in chosen categories" },
  { value: "donations", label: "Verified donations" },
  { value: "referrals", label: "Recruited volunteers" },
  { value: "points", label: "Total points" },
];

const EMPTY = { id: null, name: "", description: "", icon: "🏅", rule_type: "events", threshold: 1, categories: [] };

export default function AdminBadgesPage() {
  useDocumentTitle("Badges");
  const { data, loading, error, reload } = useApiData(listBadges, []);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim() || "🏅",
      rule_type: form.rule_type,
      threshold: Number(form.threshold),
      categories: form.rule_type === "category_events" ? form.categories : [],
    };
    try {
      if (form.id) await updateBadge(form.id, body);
      else await createBadge(body);
      setMessage({ type: "success", text: form.id ? "Badge updated." : "Badge created. Volunteers who already qualify received it." });
      setForm(EMPTY);
      reload();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (badge) => {
    if (!window.confirm(`Delete the "${badge.name}" badge? Volunteers will lose it.`)) return;
    try {
      await deleteBadge(badge.id);
      reload();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Badges" subtitle="Define the achievements volunteers can earn." />
      <form className="card stack" onSubmit={submit} noValidate>
        <h2>{form.id ? `Edit "${form.name}"` : "New badge"}</h2>
        {message.text && <Alert type={message.type}>{message.text}</Alert>}
        <div className="grid-2">
          <FormField label="Name" value={form.name} onChange={set("name")} maxLength={60} />
          <FormField label="Icon (emoji)" value={form.icon} onChange={set("icon")} maxLength={8} />
          <FormField as="select" label="Earned by" value={form.rule_type} onChange={set("rule_type")}>
            {RULES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </FormField>
          <FormField label="Needed amount" type="number" min="1" value={form.threshold} onChange={set("threshold")} />
        </div>
        <FormField label="Description" value={form.description} onChange={set("description")} maxLength={200} />
        {form.rule_type === "category_events" && (
          <TagInput label="Categories" value={form.categories} onChange={(categories) => setForm((f) => ({ ...f, categories }))} placeholder="e.g. Plantation" />
        )}
        <div className="row row--end">
          {form.id && <Button variant="ghost" onClick={() => setForm(EMPTY)}>Cancel edit</Button>}
          <Button type="submit" loading={saving}>{form.id ? "Save badge" : "Create badge"}</Button>
        </div>
      </form>

      <QueryState loading={loading} error={error} onRetry={reload}>
        <div className="table-wrap card">
          <table className="table">
            <thead><tr><th>Badge</th><th>Rule</th><th>Holders</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {(data || []).map((b) => (
                <tr key={b.id}>
                  <td>{b.icon} <strong>{b.name}</strong><br /><small className="muted">{b.description}</small></td>
                  <td>{RULES.find((r) => r.value === b.rule_type)?.label}: {b.threshold}{b.categories?.length ? ` (${b.categories.join(", ")})` : ""}</td>
                  <td>{b.holders}</td>
                  <td className="cell-actions">
                    <div className="row row--end">
                      <Button size="sm" variant="secondary" onClick={() => setForm({ ...EMPTY, ...b })}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(b)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
