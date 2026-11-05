// In-memory fake backend so every Part A screen works before the real API exists.
// Data resets on page refresh. Delete this folder once the backend is complete.
import { ApiError } from "../httpClient";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
let nextId = 100;
const newId = (prefix) => `${prefix}${nextId++}`;

// ---------- Users (mock auth). Password for all: password123 ----------
const users = [
  { id: "u1", name: "Aarav Mehta", email: "volunteer@sevasetu.test", role: "volunteer", is_active: true, password: "password123", created_at: daysAgo(90) },
  { id: "u2", name: "Greenroots Trust", email: "org@sevasetu.test", role: "organization", is_active: true, organization_name: "Greenroots Trust", password: "password123", created_at: daysAgo(120) },
  { id: "u3", name: "Platform Admin", email: "admin@sevasetu.test", role: "admin", is_active: true, password: "password123", created_at: daysAgo(200) },
  { id: "u4", name: "Neha Kulkarni", email: "neha@example.com", role: "volunteer", is_active: true, password: "password123", created_at: daysAgo(30) },
  { id: "u5", name: "Anna Daan Foundation", email: "annadaan@example.com", role: "organization", is_active: true, organization_name: "Anna Daan Foundation", password: "password123", created_at: daysAgo(14) },
];

const publicUser = ({ password, ...rest }) => rest;

export async function register(payload) {
  await wait();
  const email = payload.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) {
    throw new ApiError("An account with this email already exists.", { status: 409 });
  }
  const user = {
    id: newId("u"),
    name: payload.name.trim(),
    email,
    role: payload.role,
    is_active: true,
    password: payload.password,
    created_at: new Date().toISOString(),
    ...(payload.role === "organization" ? { organization_name: payload.organization_name.trim() } : {}),
  };
  users.push(user);
  return publicUser(user);
}

export async function login({ email, password }) {
  await wait();
  const user = users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || user.password !== password || !user.is_active) {
    throw new ApiError("Incorrect email or password, or inactive account.", { status: 401 });
  }
  return { access_token: `mock-token-${user.id}`, token_type: "bearer", user: publicUser(user) };
}

export async function getCurrentUser() {
  await wait(100);
  return publicUser(users[0]);
}

// ---------- Volunteer profiles ----------
const volunteers = {
  v1: {
    id: "v1", user_id: "u1", name: "Aarav Mehta", email: "volunteer@sevasetu.test",
    city: "Mumbai", phone: "", bio: "Engineering student who enjoys weekend clean-up drives and teaching basic computer skills.",
    skills: ["Teaching", "First aid", "Photography"], interests: ["Environment", "Education"],
    availability: ["Weekends"], total_hours: 46, completed_activities: 9,
    achievements: [
      { id: "a1", title: "First Steps", earned_at: daysAgo(80) },
      { id: "a2", title: "Green Warrior", earned_at: daysAgo(35) },
    ],
    history: [
      { id: "h1", event_title: "Versova Beach Clean-up", organization_name: "Greenroots Trust", date: daysAgo(12), hours: 4 },
      { id: "h2", event_title: "Evening Maths Class", organization_name: "Shiksha Setu", date: daysAgo(26), hours: 3 },
    ],
  },
  v2: {
    id: "v2", user_id: "u4", name: "Neha Kulkarni", email: "neha@example.com", city: "Pune", phone: "",
    bio: "Nursing student, available on weekday evenings.", skills: ["First aid", "Cooking"], interests: ["Health", "Hunger relief"],
    availability: ["Weekday evenings"], total_hours: 12, completed_activities: 3, achievements: [], history: [],
  },
};

export async function getMyVolunteerProfile() {
  await wait();
  return copy(volunteers.v1);
}
export async function updateMyVolunteerProfile(data) {
  await wait();
  volunteers.v1 = { ...volunteers.v1, ...data };
  return copy(volunteers.v1);
}
export async function getVolunteerProfile(id) {
  await wait();
  if (!volunteers[id]) throw new ApiError("Volunteer not found.", { status: 404 });
  return copy(volunteers[id]);
}

// ---------- Organizations ----------
const organizations = {
  o1: {
    id: "o1", user_id: "u2", name: "Greenroots Trust", description: "Community group planting trees and cleaning coastlines across Mumbai.",
    website: "https://example.org/greenroots", city: "Mumbai", address: "Andheri West", contact_email: "org@sevasetu.test", phone: "",
    categories: ["Environment", "Community"], verification_status: "unverified", verification_note: "",
    rating_average: 4.6, rating_count: 18, stats: { events_hosted: 24, volunteers_engaged: 310 },
    events: [{ id: "e1", title: "Versova Beach Clean-up", date: daysAgo(-6), status: "upcoming" }],
  },
  o2: {
    id: "o2", user_id: "u5", name: "Anna Daan Foundation", description: "Weekly meal distribution for people experiencing hunger.",
    website: "", city: "Pune", address: "Kothrud", contact_email: "annadaan@example.com", phone: "",
    categories: ["Hunger relief"], verification_status: "pending", verification_note: "Registered NGO, certificate attached.",
    rating_average: 0, rating_count: 0, stats: { events_hosted: 2, volunteers_engaged: 14 }, events: [],
  },
};

export async function getMyOrganization() {
  await wait();
  return copy(organizations.o1);
}
export async function updateMyOrganization(data) {
  await wait();
  organizations.o1 = { ...organizations.o1, ...data };
  return copy(organizations.o1);
}
export async function getOrganization(id) {
  await wait();
  if (!organizations[id]) throw new ApiError("Organization not found.", { status: 404 });
  return copy(organizations[id]);
}
export async function requestVerification(note) {
  await wait();
  organizations.o1.verification_status = "pending";
  organizations.o1.verification_note = note || "";
  return copy(organizations.o1);
}

// ---------- Reports ----------
const reports = [
  { id: "r1", target_type: "organization", target_id: "o2", target_label: "Anna Daan Foundation", reason: "fraud", details: "Asked volunteers for a registration fee.", reporter_name: "Aarav Mehta", status: "open", resolution_note: "", created_at: daysAgo(2) },
  { id: "r2", target_type: "user", target_id: "u4", target_label: "Neha Kulkarni", reason: "spam", details: "Repeated duplicate messages.", reporter_name: "Greenroots Trust", status: "open", resolution_note: "", created_at: daysAgo(5) },
];

export async function createReport(payload) {
  await wait();
  const report = { id: newId("r"), ...payload, target_label: payload.target_label || payload.target_id, reporter_name: "You", status: "open", resolution_note: "", created_at: new Date().toISOString() };
  reports.unshift(report);
  return copy(report);
}

// ---------- Notifications ----------
const notifications = [
  { id: "n1", type: "achievement", title: "Badge earned: Green Warrior", body: "You completed 5 environment activities.", read: false, created_at: daysAgo(0.1) },
  { id: "n2", type: "reminder", title: "Event tomorrow", body: "Versova Beach Clean-up starts at 7:00 AM.", read: false, created_at: daysAgo(0.5) },
  { id: "n3", type: "registration", title: "Registration confirmed", body: "You are registered for Evening Maths Class.", read: true, created_at: daysAgo(4) },
  { id: "n4", type: "nearby", title: "New opportunity near you", body: "Tree plantation drive 3 km away this Sunday.", read: true, created_at: daysAgo(6) },
];

export async function listNotifications() {
  await wait(200);
  return copy(notifications);
}
export async function getUnreadCount() {
  await wait(100);
  return { count: notifications.filter((n) => !n.read).length };
}
export async function markNotificationRead(id) {
  await wait(100);
  const n = notifications.find((x) => x.id === id);
  if (n) n.read = true;
  return n ? copy(n) : null;
}
export async function markAllNotificationsRead() {
  await wait(150);
  notifications.forEach((n) => { n.read = true; });
  return { count: 0 };
}

// ---------- Admin ----------
export async function getAdminStats() {
  await wait();
  return {
    total_users: users.length,
    volunteers: users.filter((u) => u.role === "volunteer").length,
    organizations: users.filter((u) => u.role === "organization").length,
    pending_verifications: Object.values(organizations).filter((o) => o.verification_status === "pending").length,
    open_reports: reports.filter((r) => r.status === "open").length,
  };
}

export async function listUsers({ search = "", role = "" } = {}) {
  await wait(250);
  const q = search.trim().toLowerCase();
  return users
    .filter((u) => (!role || u.role === role) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
    .map(publicUser);
}

export async function setUserActive(id, isActive) {
  await wait(200);
  const user = users.find((u) => u.id === id);
  if (!user) throw new ApiError("User not found.", { status: 404 });
  user.is_active = isActive;
  return publicUser(user);
}

export async function listAdminOrganizations({ verification_status = "" } = {}) {
  await wait(250);
  return copy(Object.values(organizations).filter((o) => !verification_status || o.verification_status === verification_status));
}

export async function reviewOrganization(id, status, note) {
  await wait(250);
  const org = organizations[id];
  if (!org) throw new ApiError("Organization not found.", { status: 404 });
  org.verification_status = status;
  org.verification_note = note || org.verification_note;
  return copy(org);
}

export async function listReports({ status = "" } = {}) {
  await wait(250);
  return copy(reports.filter((r) => !status || r.status === status));
}

export async function updateReport(id, status, resolutionNote) {
  await wait(250);
  const report = reports.find((r) => r.id === id);
  if (!report) throw new ApiError("Report not found.", { status: 404 });
  report.status = status;
  report.resolution_note = resolutionNote || "";
  return copy(report);
}
