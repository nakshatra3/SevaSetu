import { Link } from "react-router-dom";
import Badge from "@/components/ui/Badge";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime, formatHours } from "@/utils/format";

// One opportunity in a list. Pass `children` for extra buttons, `footer` for extra info.
export default function EventCard({ event, children, footer }) {
  const full = event.spots_left === 0;

  return (
    <article className="event-card">
      <div className="event-card__top">
        <Badge tone="info">{event.category}</Badge>
        {event.status !== "upcoming" && <StatusBadge kind="event" status={event.status} />}
      </div>
      <h3>
        <Link to={`/app/opportunities/${event.id}`}>{event.title}</Link>
      </h3>
      <p className="muted event-card__org">
        {event.organization_name}
        {event.organization_verified && <span className="verified-tick" title="Verified organization"> ✔ Verified</span>}
      </p>
      <ul className="event-card__facts">
        <li>📅 {formatDateTime(event.start_time)} · {formatHours(event.duration_hours)}</li>
        <li>
          📍 {event.address ? `${event.address}, ` : ""}{event.city}
          {typeof event.distance_km === "number" && <strong> · {event.distance_km} km away</strong>}
        </li>
        <li className={full ? "text-danger" : ""}>
          👥 {full ? "Full" : `${event.spots_left} of ${event.capacity} spots left`}
        </li>
      </ul>
      {event.skills_required?.length > 0 && (
        <ul className="taglist taglist--small">
          {event.skills_required.map((skill) => (
            <li className="tag" key={skill}>{skill}</li>
          ))}
        </ul>
      )}
      {footer}
      {children && <div className="row">{children}</div>}
    </article>
  );
}
