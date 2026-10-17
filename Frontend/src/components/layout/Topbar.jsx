import Logo from "@/components/common/Logo";
import Button from "@/components/ui/Button";
import NotificationBell from "@/features/notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/config/constants";
import { initials } from "@/utils/format";

export default function Topbar() {
  const { user, logout } = useAuth();
  const displayName = user.organization_name || user.name;

  return (
    <header className="topbar">
      <Logo to="/app" />
      <div className="topbar__right">
        <NotificationBell />
        <div className="topbar__user">
          <span className="avatar" aria-hidden="true">{initials(displayName)}</span>
          <span className="topbar__who">
            <strong>{displayName}</strong>
            <small>{ROLE_LABELS[user.role]}</small>
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
      </div>
    </header>
  );
}
