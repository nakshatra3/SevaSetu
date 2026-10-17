// Reads the "exp" claim (in ms) from a JWT without verifying it.
// The backend is the only place a token is truly verified.
export function getTokenExpiry(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null; // not a JWT (e.g. mock token)
  }
}
