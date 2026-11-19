import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { Link } from "react-router-dom";
import { DEFAULT_MAP_CENTER } from "@/config/constants";
import { formatDateTime } from "@/utils/format";

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function EventsMap({ events, center, radiusKm, onPick, height = 420 }) {
  const mapCenter = center ? [center.lat, center.lng] : DEFAULT_MAP_CENTER;
  const withLocation = events.filter((e) => e.latitude != null && e.longitude != null);

  return (
    <div className="map" style={{ height }}>
      <MapContainer center={mapCenter} zoom={11} scrollWheelZoom style={{ height: "100%" }} key={mapCenter.join(",")}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <ClickHandler onPick={onPick} />}

        {center && (
          <>
            <CircleMarker center={mapCenter} radius={7} pathOptions={{ color: "#c8473d", fillOpacity: 1 }}>
              <Popup>Search point</Popup>
            </CircleMarker>
            {radiusKm && <Circle center={mapCenter} radius={radiusKm * 1000} pathOptions={{ color: "#1b7f79", fillOpacity: 0.06 }} />}
          </>
        )}

        {withLocation.map((event) => (
          <CircleMarker
            key={event.id}
            center={[event.latitude, event.longitude]}
            radius={9}
            pathOptions={{ color: "#0e3b43", fillColor: event.spots_left ? "#f2a93b" : "#9aa9ab", fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>{event.title}</strong>
              <br />
              {formatDateTime(event.start_time)}
              <br />
              {event.spots_left} spots left
              <br />
              <Link to={`/app/opportunities/${event.id}`}>View details</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
