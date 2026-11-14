import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { createCategory, deleteCategory } from "@/api/adminApi";
import { listCategories } from "@/api/eventsApi";

export default function AdminCategoriesPage() {
  useDocumentTitle("Categories");
  const { data, loading, error, reload, setData } = useApiData(listCategories, []);
  const [name, setName] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setMessage({ type: "error", text: "Enter at least 2 characters." });
      return;
    }
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const created = await createCategory(name.trim());
      setData((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setMessage({ type: "success", text: `"${created.name}" added.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    setMessage({ type: "", text: "" });
    try {
      await deleteCategory(category.id);
      setData((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Categories" subtitle="Organizers pick one of these when posting an event." />
      <form className="card row" onSubmit={add}>
        <FormField label="New category" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Disaster Relief" maxLength={50} />
        <Button type="submit" loading={saving}>Add category</Button>
      </form>
      {message.text && <Alert type={message.type}>{message.text}</Alert>}
      <QueryState loading={loading} error={error} onRetry={reload}>
        <ul className="list card">
          {(data || []).map((c) => (
            <li key={c.id}>
              <span><strong>{c.name}</strong> <span className="muted">· {c.event_count} events</span></span>
              <Button size="sm" variant="ghost" disabled={c.event_count > 0} title={c.event_count ? "Used by events" : ""} onClick={() => remove(c)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
