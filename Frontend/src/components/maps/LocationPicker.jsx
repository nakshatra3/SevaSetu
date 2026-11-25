import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import Button from "@/components/ui/Button";
import { DEFAULT_MAP_CENTER } from "@/config/constants";

function ClickToPick({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) });
    },
  });
  return null;
}

const round = (n) => Math.round(n * 100000) / 100000;

// Pick a point by clicking the map or using the browser's location.
// value: { latitude, longitude } (may be null), onChange(newValue)
export default function LocationPicker({ label = "Location", value, onChange, error, hint }) {
  const [geoError, setGeoError] = useState("");
  const hasPoint = value?.latitude != null && value?.longitude != null;
  const center = hasPoint ? [value.latitude, value.longitude] : DEFAULT_MAP_CENTER;

  const useMyLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Your browser can't share its location. Click on the map instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude) }),
      () => setGeoError("Location permission was denied. Click on the map instead.")
    );
  };

  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <span className="field__label">{label}</span>
      <div className="map map--picker">
        <MapContainer center={center} zoom={hasPoint ? 14 : 11} style={{ height: "100%" }} key={hasPoint ? "set" : "unset"}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPick onChange={onChange} />
          {hasPoint && <CircleMarker center={center} radius={9} pathOptions={{ color: "#c8473d", fillOpacity: 0.9 }} />}
        </MapContainer>
      </div>
      <div className="row">
        <Button variant="secondary" size="sm" onClick={useMyLocation}>Use my current location</Button>
        <small className="muted">
          {hasPoint ? `Selected: ${value.latitude}, ${value.longitude}` : "Click on the map to choose a point."}
        </small>
      </div>
      {geoError && <p className="field__error">{geoError}</p>}
      {error ? <p className="field__error">{error}</p> : hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
