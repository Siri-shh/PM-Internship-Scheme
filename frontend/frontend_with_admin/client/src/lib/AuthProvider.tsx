// src/lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export const REDIRECT_KEY = "myapp_redirectAfterLogin";
const SESSION_KEY = "myapp_isAuthenticated";
const USER_KEY = "myapp_user";
const PORTAL_SELECTED = "portalSelected";

// Local Storage Keys for "Database"
const DB_STUDENTS_KEY = "myapp_db_students";
const DB_COMPANIES_KEY = "myapp_db_companies";

type User = { name?: string; email?: string; role?: "student" | "company" | "admin" } | null;

type AuthContextProps = {
  isAuthenticated: boolean;
  initialized: boolean;
  user: User;
  loginStudent: (email: string, password: string) => Promise<void>;
  registerStudent: (name: string, email: string, password: string) => Promise<void>;
  loginCompany: (email: string, password: string) => Promise<void>;
  registerCompany: (name: string, email: string, password: string, sector?: string) => Promise<void>;
  loginAdmin: (password: string) => Promise<void>;
  logout: () => void;
  // Legacy support (optional, can be removed if unused)
  login: (userData?: Partial<User>) => void;
  signup: (userData?: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  initialized: false,
  user: null,
  loginStudent: async () => { },
  registerStudent: async () => { },
  loginCompany: async () => { },
  registerCompany: async () => { },
  loginAdmin: async () => { },
  logout: () => { },
  login: () => { },
  signup: () => { },
});

function normalizePath(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost").pathname;
  } catch {
    return raw;
  }
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
    } catch (e) {
      console.warn("[AuthProvider] init error", e);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setInitialized(true);
    }
  }, []);

  const setSession = (u: User) => {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
      sessionStorage.setItem(USER_KEY, JSON.stringify(u));
      setIsAuthenticated(true);
      setUser(u);
    } catch (e) {
      console.warn("[AuthProvider] setSession error", e);
    }
  };

  // --- STUDENT AUTH ---

  const registerStudent = async (name: string, email: string, pass: string) => {
    // Check if user exists
    const studentsStr = localStorage.getItem(DB_STUDENTS_KEY);
    const students = studentsStr ? JSON.parse(studentsStr) : [];

    if (students.find((s: any) => s.email === email)) {
      throw new Error("User already exists with this email.");
    }

    // Save new student
    const newStudent = { name, email, password: pass }; // In a real app, hash this!
    students.push(newStudent);
    localStorage.setItem(DB_STUDENTS_KEY, JSON.stringify(students));

    // Redirect to login (do not auto-login)
    window.location.href = "/login";
  };

  const loginStudent = async (email: string, pass: string) => {
    const studentsStr = localStorage.getItem(DB_STUDENTS_KEY);
    const students = studentsStr ? JSON.parse(studentsStr) : [];

    const found = students.find((s: any) => s.email === email && s.password === pass);
    if (!found) {
      throw new Error("Invalid email or password.");
    }

    const u = { name: found.name, email: found.email, role: "student" as const };
    setSession(u);
    sessionStorage.setItem(PORTAL_SELECTED, "student");
    window.location.href = "/student";
  };

  // --- COMPANY AUTH ---

  const registerCompany = async (name: string, email: string, pass: string, sector?: string) => {
    const companiesStr = localStorage.getItem(DB_COMPANIES_KEY);
    const companies = companiesStr ? JSON.parse(companiesStr) : [];

    if (companies.find((c: any) => c.email === email)) {
      throw new Error("Company already registered with this email.");
    }

    const newCompany = { name, email, password: pass, sector: sector || "Other" };
    companies.push(newCompany);
    localStorage.setItem(DB_COMPANIES_KEY, JSON.stringify(companies));

    // Also save to companyRegistration for portal display
    const companyRegistration = {
      companyName: name,
      industrySector: sector || "Other",
      hqLocation: "Not specified", // Can be added to registration form later
      email: email
    };
    localStorage.setItem("companyRegistration", JSON.stringify(companyRegistration));

    // Redirect to company login
    window.location.href = "/company-login";
  };

  const loginCompany = async (email: string, pass: string) => {
    const companiesStr = localStorage.getItem(DB_COMPANIES_KEY);
    const companies = companiesStr ? JSON.parse(companiesStr) : [];

    const foundCompany = companies.find((c: any) => c.email === email && c.password === pass);
    if (!foundCompany) {
      throw new Error("Invalid company credentials.");
    }

    const u = { name: foundCompany.name, email: foundCompany.email, role: "company" as const };
    setSession(u);
    sessionStorage.setItem(PORTAL_SELECTED, "company");
    window.location.href = "/company";
  };

  // --- ADMIN AUTH ---

  const loginAdmin = async (pass: string) => {
    if (pass !== "12345") {
      throw new Error("Invalid admin password.");
    }
    const u = { name: "Admin", role: "admin" as const };
    setSession(u);
    sessionStorage.setItem(PORTAL_SELECTED, "admin");
    window.location.href = "/admin";
  };

  const logout = () => {
    try {
      sessionStorage.clear();
    } catch (e) { }
    setIsAuthenticated(false);
    setUser(null);
    window.location.replace("/");
  };

  // Legacy stubs to prevent breaking existing code temporarily
  const login = (userData?: Partial<User>) => {
    // Default to student behavior for legacy calls
    if (userData?.email) {
      // This is a bit hacky, but legacy login didn't take password. 
      // We'll assume if this is called, it's a bypass or mock.
      // Ideally, we replace all calls to this.
      setSession({ ...userData, role: "student" } as User);
      window.location.href = "/student";
    }
  };
  const signup = (userData?: Partial<User>) => login(userData);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, initialized, user,
      loginStudent, registerStudent,
      loginCompany, registerCompany,
      loginAdmin,
      logout,
      login, signup
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
