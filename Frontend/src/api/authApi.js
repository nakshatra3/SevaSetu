import { http } from "./httpClient";

export const register = (payload) => http.post("/auth/register", payload, { skipAuth: true });

export const login = ({ email, password }) => http.post("/auth/login", { email, password }, { skipAuth: true });

export const getCurrentUser = () => http.get("/auth/me");
