import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NAV_ITEMS } from "@/config/navigation";

export default function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS[user.role] || [];

  return (
    <nav className="sidebar" aria-label="Main">
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
