import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import TagInput from "@/components/ui/TagInput";
import { AVAILABILITY_OPTIONS } from "@/config/constants";

export default function VolunteerProfileForm({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({
    city: profile.city || "",
    phone: profile.phone || "",
    bio: profile.bio || "",
    skills: profile.skills,
    interests: profile.interests,
    availability: profile.availability,
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleAvailability = (option) =>
    setForm((f) => ({
      ...f,
      availability: f.availability.includes(option) ? f.availability.filter((o) => o !== option) : [...f.availability, option],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      await onSave({ ...form, city: form.city.trim(), phone: form.phone.trim(), bio: form.bio.trim() });
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      <h2>Edit profile</h2>
      <Alert type="error">{error}</Alert>
      <div className="grid-2">
        <FormField label="City" value={form.city} onChange={set("city")} error={fieldErrors.city} />
        <FormField label="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} error={fieldErrors.phone} />
      </div>
      <FormField as="textarea" rows={4} label="About you" maxLength={500} value={form.bio} onChange={set("bio")} error={fieldErrors.bio} hint={`${form.bio.length}/500`} />
      <TagInput label="Skills" value={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} placeholder="e.g. Teaching" />
      <TagInput label="Interests" value={form.interests} onChange={(interests) => setForm((f) => ({ ...f, interests }))} placeholder="e.g. Environment" />
      <fieldset className="checkgroup">
        <legend>Availability</legend>
        {AVAILABILITY_OPTIONS.map((option) => (
          <label key={option}>
            <input type="checkbox" checked={form.availability.includes(option)} onChange={() => toggleAvailability(option)} />
            {option}
          </label>
        ))}
      </fieldset>
      <div className="row row--end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save profile</Button>
      </div>
    </form>
  );
}
