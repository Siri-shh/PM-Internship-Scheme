// src/lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export const REDIRECT_KEY = "myapp_redirectAfterLogin";
const SESSION_KEY = "myapp_isAuthenticated";
const USER_KEY = "myapp_user";
const PORTAL_SELECTED = "portalSelected";

type User = { name?: string; email?: string } | null;
type AuthContextProps = {
  isAuthenticated: boolean;
  initialized: boolean;
  user: User;
  login: (userData?: Partial<User>) => void;
  signup: (userData?: Partial<User>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  initialized: false,
  user: null,
  login: () => {},
  signup: () => {},
  logout: () => {},
});

function normalizePath(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost").pathname;
  } catch {
    return raw;
  }
}
function redirectToPortalKey(pathname: string | null): "student" | "company" | "admin" | null {
  if (!pathname) return null;
  const p = pathname.toLowerCase();
  if (p.startsWith("/student")) return "student";
  if (p.startsWith("/company")) return "company";
  if (p.startsWith("/admin")) return "admin";
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      const u = sessionStorage.getItem(USER_KEY);
      setIsAuthenticated(s === "true");
      setUser(u ? JSON.parse(u) : null);
      console.info("[AuthProvider] init", { isAuthenticated: s === "true", user: u ? JSON.parse(u) : null });
    } catch (e) {
      console.warn("[AuthProvider] init error", e);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setInitialized(true);
    }
  }, []);

  const setPortalSafely = (key: string | null) => {
    try {
      if (key) sessionStorage.setItem(PORTAL_SELECTED, key);
    } catch (e) {
      console.warn("[AuthProvider] setPortalSafely failed", e);
    }
  };

  const login = (userData?: Partial<User>) => {
    const u = userData ?? { name: "User" };
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
      sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (e) {
      console.warn("[AuthProvider] login storage error", e);
    }
    setIsAuthenticated(true);
    setUser(u);
    // redirect logic
    try {
      const raw = sessionStorage.getItem(REDIRECT_KEY);
      const pathname = normalizePath(raw);
      const portalKey = redirectToPortalKey(pathname);
      console.info("[AuthProvider] login redirect info", { raw, pathname, portalKey });
      if (portalKey && pathname) {
        setPortalSafely(portalKey);
        sessionStorage.removeItem(REDIRECT_KEY);
        // small delay ensures storage is flushed before navigation
        setTimeout(() => window.location.replace(pathname), 40);
        return;
      }
      const existing = sessionStorage.getItem(PORTAL_SELECTED);
      if (existing) {
        setPortalSafely(existing);
        setTimeout(() => window.location.replace(`/${existing}`), 40);
        return;
      }
    } catch (e) {
      console.warn("[AuthProvider] login redirect error", e);
    }
    setTimeout(() => window.location.replace("/"), 40);
  };

  const signup = (userData?: Partial<User>) => login(userData);

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(PORTAL_SELECTED);
      sessionStorage.removeItem(REDIRECT_KEY);
      console.info("[AuthProvider] cleared sessionStorage on logout");
    } catch (e) {
      console.warn("[AuthProvider] logout storage error", e);
    }
    setIsAuthenticated(false);
    setUser(null);
    // Use replace to avoid back navigation to protected routes
    setTimeout(() => window.location.replace("/"), 30);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, initialized, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
