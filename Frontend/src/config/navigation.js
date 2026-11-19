import { ROLES } from "./constants";

// Sidebar links per role. When you build Part B / Part C features,
// add their links here and the sidebar updates by itself.
export const NAV_ITEMS = {
  [ROLES.VOLUNTEER]: [
    { to: "/app/volunteer/profile", label: "My profile" },
    { to: "/app/notifications", label: "Notifications" },
  ],
  [ROLES.ORGANIZATION]: [
    { to: "/app/organization/profile", label: "Organization profile" },
    { to: "/app/notifications", label: "Notifications" },
  ],
  [ROLES.ADMIN]: [
    { to: "/app/admin", label: "Overview", end: true },
    { to: "/app/admin/users", label: "Users" },
    { to: "/app/admin/organizations", label: "Organizations" },
    { to: "/app/admin/reports", label: "Reports" },
    { to: "/app/notifications", label: "Notifications" },
  ],
};
