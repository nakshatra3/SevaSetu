import axios from "axios";
import { env } from "@/config/env";
import { tokenStorage } from "@/utils/storage";

// One shared Axios instance for the whole app.
// Every API file (eventsApi.js, donationsApi.js...) uses `http` from here.

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors; // { fieldName: "message" }
    this.data = data;
  }
}

// AuthContext registers a callback here so any 401 logs the user out.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

// Understands FastAPI errors: { detail: "text" } or { detail: [{loc, msg}] }.
function parseErrorBody(data) {
  if (data && typeof data.detail === "string") {
    return { message: data.detail, fieldErrors: {} };
  }
  if (data && Array.isArray(data.detail)) {
    const fieldErrors = {};
    data.detail.forEach((err) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : null;
      const text = String(err.msg || "Invalid value").replace(/^Value error, /, "");
      if (typeof field === "string" && field !== "body" && !(field in fieldErrors)) {
        fieldErrors[field] = text;
      }
    });
    // Errors that are not about a single field (e.g. "End time must be after the start time.")
    const general = data.detail.find((err) => !err.loc || err.loc.length <= 1 || err.loc[err.loc.length - 1] === "body");
    const message = general ? String(general.msg).replace(/^Value error, /, "") : "Please check the highlighted fields.";
    return { message, fieldErrors };
  }
  return { message: DEFAULT_MESSAGE, fieldErrors: {} };
}

const api = axios.create({
  baseURL: env.API_BASE_URL,
  headers: { Accept: "application/json" },
});

// Add the login token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turn every failure into an ApiError with a readable message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) throw error;
    if (!error.response) {
      throw new ApiError("Cannot reach the server. Is the backend running?");
    }
    const { status, data, config } = error.response;
    if (status === 401 && !config.skipAuth && tokenStorage.get() && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const { message, fieldErrors } = parseErrorBody(data);
    throw new ApiError(message, { status, fieldErrors, data });
  }
);

// Leave out empty filters so the backend doesn't receive "date_from=" etc.
function cleanParams(params = {}) {
  const result = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") result[key] = value;
  });
  return result;
}

// Small helpers that return the response data directly.
export const http = {
  get: (path, { params, ...options } = {}) =>
    api.get(path, { ...options, params: cleanParams(params) }).then((res) => res.data),
  post: (path, body, options) => api.post(path, body, options).then((res) => res.data),
  put: (path, body, options) => api.put(path, body, options).then((res) => res.data),
  patch: (path, body, options) => api.patch(path, body, options).then((res) => res.data),
  delete: (path, options) => api.delete(path, options).then((res) => res.data),
};

export default api;
