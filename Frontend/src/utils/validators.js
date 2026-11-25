// Rules mirror Backend/app/schemas.py so users see errors before the request.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  if (!value.trim()) return "Enter your email address.";
  if (!EMAIL_RE.test(value.trim())) return "Enter a valid email address.";
  return "";
}

export function validateName(value) {
  const v = value.trim();
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (v.length > 100) return "Name must be 100 characters or fewer.";
  return "";
}

export function validateOrganizationName(value) {
  const v = value.trim();
  if (v.length < 2) return "Organization name must be at least 2 characters.";
  if (v.length > 150) return "Organization name must be 150 characters or fewer.";
  return "";
}

export function validatePassword(value) {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be 128 characters or fewer.";
  return "";
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
