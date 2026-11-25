import Badge from "@/components/ui/Badge";
import { VERIFICATION_LABELS } from "@/config/constants";

const TONES = { verified: "success", pending: "warning", rejected: "danger", unverified: "neutral" };

export default function VerificationBadge({ status = "unverified" }) {
  return <Badge tone={TONES[status] || "neutral"}>{VERIFICATION_LABELS[status] || status}</Badge>;
}
