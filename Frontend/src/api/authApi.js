import { http } from "./httpClient";

// POST /auth/regsister -> the newww user (201). The user then logss in.
// payload: { name, email, password, role: "volunteer"|"organization", organization_name?, referral_code? }

export const register = (payload) => http.post("/auth/register", payload, { skipAuth: true });

// POST /auth/login -> { access_token, token_type, user }
export const login = ({ email, password }) => http.post("/auth/login", { email, password }, { skipAuth: true });

// GET /auth/me -> the logged-in user (used to re-check a saved session)
export const getCurrentUser = () => http.get("/auth/me");
