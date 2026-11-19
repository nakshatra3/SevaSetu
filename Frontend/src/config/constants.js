export const ROLES = {
  VOLUNTEER: "volunteer",
  ORGANIZATION: "organization",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  volunteer: "Volunteer",
  organization: "Organization",
  admin: "Admin",
};

export const ROLE_HOME = {
  volunteer:   "/app/volunteer/dashboard",
  organization:  "/app/organization/dashboard",
  admin: "/app/admin",
};

export const VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

export const VERIFICATION_LABELS = {
  unverified: "Not verified",
  pending:  "Verification pending",
  verified: "Verified",
  rejected:  "Verification rejected",
};

export const REPORT_TARGETS = {
  USER: "user",
  ORGANIZATION:"organization",
  EVENT: "event",
};

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or fake listing" },
  { value: "harassment", label: "Harassment or abuse" },
  { value:  "unsafe", label: "Unsafe activity" },
  { value: "fraud", label: "Fraud or misleading information" },
  { value: "other", label: "Something else" },
];

export const REPORT_STATUS = {
  OPEN: "open",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
};

export const AVAILABILITY_OPTIONS = [
  "Weekday mornings", 
  "Weekday afternoons", 
  "Weekday evenings", 
  "Weekends",
];

export const EVENT_STATUS_TONES = {
  upcoming: "info",
  ongoing: "warning",
  completed: "success",
  cancelled: "danger",
};

export const REGISTRATION_STATUS_TONES = {
  registered: "info",
  attended: "success",
  cancelled: "neutral",
};
export const DONATION_TYPES = [
  { value: "books", label: "Books", unit: "books" },
  { value: "clothes", label: "Clothes", unit: "items" },
  { value: "food", label: "Food", unit: "kg / packets" },
  { value: "money", label: "Money", unit: "rupees" },
];

export const DONATION_STATUS_TONES = {
  pending: "warning",
  verified: "success",
  rejected: "danger",
};

export const DEFAULT_MAP_CENTER = [19.076, 72.8777];

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
