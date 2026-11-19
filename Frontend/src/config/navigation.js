import { ROLES } from "./constants";

export const NAV_ITEMS = {
  [ROLES.VOLUNTEER]: [
    { to: "/app/volunteer/dashboard", label: "Dashboard" },
    { to: "/app/opportunities", label: "Find opportunities" },
    { to: "/app/recommendations", label: "Recommended for you" },
    { to: "/app/volunteer/activities", label: "My activities" },
    { to: "/app/checkin", label: "Check in" },
    { to: "/app/donations", label: "Donations" },
    { to: "/app/leaderboards", label: "Leaderboards" },
    { to: "/app/badges", label: "Badges & points" },
    { to: "/app/volunteer/profile", label: "My profile" },
    { to: "/app/notifications", label: "Notifications" },
  ],
  [ROLES.ORGANIZATION]: [
    { to: "/app/organization/dashboard", label: "Dashboard" },
    { to: "/app/organization/events", label: "My events", end: true },
    { to: "/app/organization/events/new", label: "Post an event" },
    { to: "/app/opportunities", label: "All opportunities" },
    { to: "/app/donations", label: "Donations received" },
    { to: "/app/leaderboards", label: "Leaderboards" },
    { to: "/app/organization/profile", label: "Organization profile" },
    { to: "/app/notifications", label: "Notifications" },
  ],
  [ROLES.ADMIN]: [
    { to: "/app/admin", label: "Overview", end: true },
    { to: "/app/admin/users", label: "Users" },
    { to: "/app/admin/organizations", label: "Organizations" },
    { to: "/app/admin/events", label: "Events" },
    { to: "/app/admin/reports", label: "Reports" },
    { to: "/app/admin/categories", label: "Categories" },
    { to: "/app/admin/badges", label: "Badges" },
    { to: "/app/leaderboards", label: "Leaderboards" },
    { to: "/app/notifications", label: "Notifications" },
  ],
};
