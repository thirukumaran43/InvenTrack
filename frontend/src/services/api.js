const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const API_BASE_URL = BASE_URL;

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function apiFetch(endpoint, token, options = {}) {
  if (!token) {
    throw new Error("Authentication required. Please sign in again.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw new Error("Your session has expired. Please sign in again.");
  }

  return response;
}