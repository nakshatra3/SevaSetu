import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import QueryState from "@/components/common/QueryState";
import EventCard from "@/components/events/EventCard";
import EventsMap from "@/components/maps/EventsMap";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listCategories, searchEvents } from "@/api/eventsApi";
import { AVAILABILITY_OPTIONS, RADIUS_OPTIONS, ROLES } from "@/config/constants";

const EMPTY_FILTERS = {
  q: "",
  category: "",
  city: "",
  date_from: "",
  date_to: "",
  min_hours: "",
  max_hours: "",
  skills: "",
  time_slot: "",
  has_spots: false,
  radius_km: "25",
};

export default function OpportunitiesPage() {
  useDocumentTitle("Find opportunities");
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [center, setCenter] = useState(null);
  const [view, setView] = useState("list");
  const [geoError, setGeoError] = useState("");

  const { data: categories } = useApiData(listCategories, []);

  const params = {
    ...applied,
    has_spots: applied.has_spots || undefined,
    radius_km: center ? applied.radius_km : undefined,
    lat: center?.lat,
    lng: center?.lng,
    sort: center ? "distance" : "date",
  };
  const { data: events, loading, error, reload } = useApiData(() => searchEvents(params), [JSON.stringify(params)]);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied(form);
  };

  const clearFilters = () => {
    setForm(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setCenter(null);
  };

  const useMyLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Your browser can't share its location. Switch to the map and click a point instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Location permission was denied. Switch to the map and click a point instead.")
    );
  };

  return (
    <div className="stack stack--lg">
      <PageHeader
        title="Volunteer opportunities"
        subtitle="Teaching, clean-ups, plantation drives, food distribution and more."
        actions={
          user.role === ROLES.ORGANIZATION && (
            <Link className="btn btn--primary" to="/app/organization/events/new">Post an event</Link>
          )
        }
      />

      <form className="card stack" onSubmit={applyFilters}>
        <div className="filters-grid">
          <FormField label="Keyword" placeholder="Title, skill, place..." value={form.q} onChange={set("q")} />
          <FormField as="select" label="Category" value={form.category} onChange={set("category")}>
            <option value="">All categories</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </FormField>
          <FormField label="City" placeholder="e.g. Mumbai" value={form.city} onChange={set("city")} />
          <FormField label="Skills" placeholder="e.g. Teaching, Cooking" value={form.skills} onChange={set("skills")} />
          <FormField label="From date" type="date" value={form.date_from} onChange={set("date_from")} />
          <FormField label="To date" type="date" value={form.date_to} onChange={set("date_to")} />
          <FormField label="Min hours" type="number" min="0" step="0.5" value={form.min_hours} onChange={set("min_hours")} />
          <FormField label="Max hours" type="number" min="0" step="0.5" value={form.max_hours} onChange={set("max_hours")} />
          <FormField as="select" label="When I'm free" value={form.time_slot} onChange={set("time_slot")}>
            <option value="">Any time</option>
            {AVAILABILITY_OPTIONS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </FormField>
          <FormField as="select" label="Distance" value={form.radius_km} onChange={set("radius_km")} hint={center ? "From your search point" : "Set a search point first"}>
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>Within {km} km</option>
            ))}
          </FormField>
        </div>
        <label className="checkline">
          <input type="checkbox" checked={form.has_spots} onChange={set("has_spots")} />
          Only show events with free spots
        </label>
        <div className="row row--between">
          <div className="row">
            <Button variant="secondary" size="sm" onClick={useMyLocation}>📍 Near me</Button>
            {center && (
              <>
                <span className="muted">Searching near {center.lat.toFixed(3)}, {center.lng.toFixed(3)}</span>
                <Button variant="ghost" size="sm" onClick={() => setCenter(null)}>Clear location</Button>
              </>
            )}
          </div>
          <div className="row">
            <Button variant="ghost" onClick={clearFilters}>Clear all</Button>
            <Button type="submit">Search</Button>
          </div>
        </div>
        {geoError && <Alert type="warning">{geoError}</Alert>}
      </form>

      <div className="row row--between">
        <h2>{events ? `${events.length} ${events.length === 1 ? "opportunity" : "opportunities"}` : "Results"}</h2>
        <Tabs value={view} onChange={setView} options={[{ value: "list", label: "List" }, { value: "map", label: "Map" }]} />
      </div>

      <QueryState loading={loading} error={error} onRetry={reload}>
        {view === "map" ? (
          <div className="stack">
            <p className="muted">Tip: click anywhere on the map to search around that point.</p>
            <EventsMap
              events={events || []}
              center={center}
              radiusKm={center ? Number(applied.radius_km) : null}
              onPick={(point) => {
                setCenter(point);
                setApplied(form);
              }}
            />
          </div>
        ) : events?.length ? (
          <div className="card-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState title="No opportunities match" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>
            Try a wider distance, another category or different dates.
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}
