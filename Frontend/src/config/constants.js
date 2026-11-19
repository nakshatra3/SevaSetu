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

// Where each role lands after login.
export const ROLE_HOME = {
  volunteer: "/app/volunteer/profile",
  organization: "/app/organization/profile",
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
  pending: "Verification pending",
  verified: "Verified",
  rejected: "Verification rejected",
};

export const REPORT_TARGETS = {
  USER: "user",
  ORGANIZATION: "organization",
  EVENT: "event", // used once Part B (events) exists
};

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or fake listing" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "unsafe", label: "Unsafe activity" },
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
  "Weekday evenings",
  "Weekends",
  "Public holidays",
];
