import axios from "axios";
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

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

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


api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

function cleanParams(params = {}) {
  const result = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") result[key] = value;
  });
  return result;
}

export const http = {
  get: (path, { params, ...options } = {}) =>
    api.get(path, { ...options, params: cleanParams(params) }).then((res) => res.data),
  post: (path, body, options) => api.post(path, body, options).then((res) => res.data),
  put: (path, body, options) => api.put(path, body, options).then((res) => res.data),
  patch: (path, body, options) => api.patch(path, body, options).then((res) => res.data),
  delete: (path, options) => api.delete(path, options).then((res) => res.data),
};

export default api;
