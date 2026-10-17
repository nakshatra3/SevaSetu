import { env } from "@/config/env";
import { tokenStorage } from "@/utils/storage";

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
      if (typeof field === "string" && !(field in fieldErrors)) {
        fieldErrors[field] = String(err.msg || "Invalid value").replace(/^Value error, /, "");
      }
    });
    return { message: "Please check the highlighted fields.", fieldErrors };
  }
  return { message: DEFAULT_MESSAGE, fieldErrors: {} };
}

function buildUrl(path, params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });
  const qs = query.toString();
  return `${env.API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function request(method, path, { body, params, auth = true, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = tokenStorage.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the server. Check your connection and try again.");
  }

  let data = null;
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && token && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const { message, fieldErrors } = parseErrorBody(data);
    throw new ApiError(message, { status: response.status, fieldErrors, data });
  }

  return data;
}

export const http = {
  get: (path, options) => request("GET", path, options),
  post: (path, body, options) => request("POST", path, { ...options, body }),
  put: (path, body, options) => request("PUT", path, { ...options, body }),
  patch: (path, body, options) => request("PATCH", path, { ...options, body }),
  delete: (path, options) => request("DELETE", path, options),
};
