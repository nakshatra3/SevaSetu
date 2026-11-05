// Single place that reads environment variables.
export const env = {
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, ""),
  USE_MOCK_AUTH: import.meta.env.VITE_USE_MOCK_AUTH === "true",
  // Defaults to true because only /auth exists in the backend so far.
  USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA !== "false",
};
