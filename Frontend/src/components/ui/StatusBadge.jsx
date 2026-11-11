import Badge from "./Badge";
import { DONATION_STATUS_TONES, EVENT_STATUS_TONES, REGISTRATION_STATUS_TONES } from "@/config/constants";

const TONES = {
  event: EVENT_STATUS_TONES,
  registration: REGISTRATION_STATUS_TONES,
  donation: DONATION_STATUS_TONES,
};

// <StatusBadge kind="event" status="upcoming" />
export default function StatusBadge({ kind, status }) {
  const tone = TONES[kind]?.[status] || "neutral";
  const label = status ? status[0].toUpperCase() + status.slice(1) : "-";
  return <Badge tone={tone}>{label}</Badge>;
}
