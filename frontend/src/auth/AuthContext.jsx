import { useEffect } from "react";
import { API_BASE_URL } from "../services/api";
import { setUnauthorizedHandler } from "../services/api";
import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext(null);

const LOGIN_API = `${API_BASE_URL}/api/auth/login`;
const SESSION_STORAGE_KEY = "inventrack_session";

function readStoredSession() {
  try {
    const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
      return { token: null, user: null };
    }

    const session = JSON.parse(storedSession);

    if (!session?.token || !session?.user) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return { token: null, user: null };
    }

    return {
      token: session.token,
      user: session.user,
    };
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [initialSession] = useState(readStoredSession);
  const [token, setToken] = useState(initialSession.token);
  const [user, setUser] = useState(initialSession.user);

  const login = useCallback(async (email, password) => {
    const response = await fetch(LOGIN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an invalid login response.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Invalid email or password");
    }

    if (!data.token) {
      throw new Error("The login response did not contain an access token.");
    }

    const userData = {
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
    };

    const session = {
      token: data.token,
      user: userData,
    };

    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );

    setToken(data.token);
    setUser(userData);

    return data;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
  setUnauthorizedHandler(logout);

  return () => {
    setUnauthorizedHandler(null);
  };
}, [logout]);

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
