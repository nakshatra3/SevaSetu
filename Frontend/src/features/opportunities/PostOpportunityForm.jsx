import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import TagInput from "@/components/ui/TagInput";
import Spinner from "@/components/ui/Spinner";
import LocationPicker from "@/components/maps/LocationPicker";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { createEvent, getEvent, listCategories, updateEvent } from "@/api/eventsApi";
import { toDateTimeInput } from "@/utils/format";

const EMPTY = {
  title: "",
  description: "",
  category: "",
  city: "",
  address: "",
  latitude: null,
  longitude: null,
  start_time: "",
  end_time: "",
  capacity: 20,
  skills_required: [],
};

function validate(form) {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = "Title must be at least 3 characters.";
  if (form.description.trim().length < 10) errors.description = "Describe the activity in at least 10 characters.";
  if (!form.category) errors.category = "Choose a category.";
  if (form.city.trim().length < 2) errors.city = "Enter the city.";
  if (form.latitude == null) errors.location = "Click on the map to mark where volunteers should come.";
  if (!form.start_time) errors.start_time = "Choose a start time.";
  if (!form.end_time) errors.end_time = "Choose an end time.";
  if (form.start_time && form.end_time && form.end_time <= form.start_time) errors.end_time = "End time must be after the start time.";
  if (!(Number(form.capacity) >= 1)) errors.capacity = "At least 1 volunteer.";
  return errors;
}

export default function PostOpportunityForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? "Edit event" : "Post an event");
  const navigate = useNavigate();

  const { data: categories } = useApiData(listCategories, []);
  const [form, setForm] = useState(EMPTY);
  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getEvent(id)
      .then((event) =>
        setForm({
          ...EMPTY,
          ...event,
          start_time: toDateTimeInput(event.start_time),
          end_time: toDateTimeInput(event.end_time),
        })
      )
      .catch((err) => setSubmitError(err.message))
      .finally(() => setLoadingEvent(false));
  }, [id, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      city: form.city.trim(),
      address: form.address.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      start_time: form.start_time, 
      end_time: form.end_time,
      capacity: Number(form.capacity),
      skills_required: form.skills_required,
    };

    setSaving(true);
    try {
      const saved = isEdit ? await updateEvent(id, payload) : await createEvent(payload);
      navigate(`/app/organization/events/${saved.id}/manage`, {
        state: { notice: isEdit ? "Event updated. Registered volunteers were notified." : "Event published!" },
      });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setSubmitError(err.message);
      setSaving(false);
    }
  };

  if (loadingEvent) return <Spinner />;

  return (
    <div className="stack stack--lg">
      <PageHeader
        title={isEdit ? "Edit event" : "Post a volunteering opportunity"}
        subtitle="Volunteers nearby are notified when you publish."
      />
      <form className="card stack" onSubmit={submit} noValidate>
        <Alert type="error">{submitError}</Alert>
        <FormField label="Title" placeholder="e.g. Saturday Beach Clean-up" value={form.title} onChange={set("title")} error={errors.title} />
        <FormField as="textarea" rows={4} label="Description" maxLength={2000} placeholder="What will volunteers do? What should they bring?" value={form.description} onChange={set("description")} error={errors.description} />
        <div className="grid-2">
          <FormField as="select" label="Category" value={form.category} onChange={set("category")} error={errors.category}>
            <option value="">Choose a category</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </FormField>
          <FormField label="Volunteers needed (capacity)" type="number" min="1" max="1000" value={form.capacity} onChange={set("capacity")} error={errors.capacity} />
          <FormField label="Starts" type="datetime-local" value={form.start_time} onChange={set("start_time")} error={errors.start_time} />
          <FormField label="Ends" type="datetime-local" value={form.end_time} onChange={set("end_time")} error={errors.end_time} />
          <FormField label="City" value={form.city} onChange={set("city")} error={errors.city} />
          <FormField label="Address / landmark" value={form.address} onChange={set("address")} error={errors.address} />
        </div>
        <LocationPicker
          label="Exact location on the map"
          value={{ latitude: form.latitude, longitude: form.longitude }}
          onChange={(point) => setForm((f) => ({ ...f, ...point }))}
          error={errors.location || errors.latitude}
          hint="Used for the map and for 'near me' search."
        />
        <TagInput label="Helpful skills" value={form.skills_required} onChange={(skills_required) => setForm((f) => ({ ...f, skills_required }))} placeholder="e.g. Teaching" hint="Press Enter after each skill. Used for smart matching." />
        <div className="row row--end">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? "Save changes" : "Publish event"}</Button>
        </div>
      </form>
    </div>
  );
}
