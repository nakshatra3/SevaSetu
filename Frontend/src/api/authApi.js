import { http } from "./httpClient";
import { env } from "@/config/env";
import * as mock from "./mock/mockDb";

// Backend: POST /auth/register -> UserResponse (201)
// payload: { name, email, password, role: "volunteer"|"organization", organization_name? }
export function register(payload) {
  if (env.USE_MOCK_AUTH) return mock.register(payload);
  return http.post("/auth/register", payload, { auth: false });
}

// Backend: POST /auth/login -> { access_token, token_type, user }
export function login({ email, password }) {
  if (env.USE_MOCK_AUTH) return mock.login({ email, password });
  return http.post("/auth/login", { email, password }, { auth: false });
}

// NOT in the backend yet. Add GET /auth/me (returns UserResponse) and call this
// from AuthContext on app start to re-validate a stored token.
export function getCurrentUser() {
  if (env.USE_MOCK_AUTH) return mock.getCurrentUser();
  return http.get("/auth/me");
}
