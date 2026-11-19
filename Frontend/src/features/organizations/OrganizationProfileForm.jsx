import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import TagInput from "@/components/ui/TagInput";
import { validateEmail, validateOrganizationName } from "@/utils/validators";

export default function OrganizationProfileForm({ org, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: org.name || "",
    description: org.description || "",
    website: org.website || "",
    city: org.city || "",
    address: org.address || "",
    contact_email: org.contact_email || "",
    phone: org.phone || "",
    categories: org.categories || [],
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {
      name: validateOrganizationName(form.name),
      contact_email: form.contact_email ? validateEmail(form.contact_email) : "",
      website: form.website && !/^https?:\/\//i.test(form.website.trim()) ? "Start the address with http:// or https://" : "",
    };
    setErrors(next);
    setError("");
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      await onSave({ ...form, name: form.name.trim(), website: form.website.trim(), contact_email: form.contact_email.trim() });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      <h2>Edit organization</h2>
      <Alert type="error">{error}</Alert>
      <FormField label="Organization name" value={form.name} onChange={set("name")} error={errors.name} />
      <FormField as="textarea" rows={4} label="Description" maxLength={1000} value={form.description} onChange={set("description")} error={errors.description} />
      <div className="grid-2">
        <FormField label="City" value={form.city} onChange={set("city")} error={errors.city} />
        <FormField label="Address" value={form.address} onChange={set("address")} error={errors.address} />
        <FormField label="Contact email" type="email" value={form.contact_email} onChange={set("contact_email")} error={errors.contact_email} />
        <FormField label="Phone" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} />
      </div>
      <FormField label="Website" type="url" placeholder="https://" value={form.website} onChange={set("website")} error={errors.website} />
      <TagInput label="Focus areas" value={form.categories} onChange={(categories) => setForm((f) => ({ ...f, categories }))} placeholder="e.g. Education" />
      <div className="row row--end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save organization</Button>
      </div>
    </form>
  );
}
