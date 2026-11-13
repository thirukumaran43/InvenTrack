
const BASE_URL = "http://localhost:8080";

let unauthorizedHandler = null;

// Register the logout function from AuthContext
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// Common authenticated API request function
export async function apiFetch(endpoint, token, options = {}) {
  // Check whether JWT token exists
  if (!token) {
    throw new Error(
      "Authentication required. Please sign in again."
    );
  }

  // Prepare request headers
  const headers = new Headers(options.headers || {});

  // Attach JWT token
  headers.set("Authorization", `Bearer ${token}`);

  // Automatically set JSON content type when sending a body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Send request to backend
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Automatically logout when the session expires or token is invalid
  if (response.status === 401) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw new Error(
      "Your session has expired. Please sign in again."
    );
  }

  // Return response for component-level handling
  return response;
}
