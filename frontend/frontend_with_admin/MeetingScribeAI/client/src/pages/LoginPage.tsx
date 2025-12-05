// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useAuth, REDIRECT_KEY } from "@/lib/AuthProvider";

export default function LoginPage(): JSX.Element {
  const { isAuthenticated, login, signup, logout } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter both name and email.");
      return false;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) {
      setError("Enter a valid email.");
      return false;
    }
    setError(null);
    return true;
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = { name: name.trim(), email: email.trim() };
      if (isSignup) signup(user);
      else login(user);
    } catch (err) {
      console.warn("Login error", err);
      setError("Failed to login.");
      setLoading(false);
    }
  };

  const continueToPortal = () => {
    try {
      const redirect = sessionStorage.getItem(REDIRECT_KEY);
      if (redirect) window.location.href = redirect;
      else {
        const portal = sessionStorage.getItem("portalSelected");
        if (portal) window.location.href = `/${portal}`;
        else window.location.href = "/";
      }
    } catch (e) {
      window.location.href = "/";
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 440 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {isAuthenticated ? (
  <div style={{ display: "flex", gap: 8 }}>
    <button onClick={continueToPortal} style={{ padding: "8px 12px", borderRadius: 6 }}>
      Continue
    </button>
    <button onClick={logout} style={{ padding: "8px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: "none" }}>
      Logout
    </button>
  </div>
) : null}

        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
          <h2 style={{ marginBottom: 8 }}>{isSignup ? "Create account" : "Login"}</h2>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }} />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }} />
            {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, borderRadius: 6, background: "#111827", color: "white", border: "none" }}>
                {loading ? "Working..." : isSignup ? "Sign up" : "Login"}
              </button>
              <button type="button" onClick={() => { setIsSignup(s => !s); setError(null); }} style={{ padding: 10, borderRadius: 6 }}>
                {isSignup ? "Back to Login" : "Sign up"}
              </button>
            </div>
          </form>
          <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => { setIsSignup(s => !s); setError(null); }} style={{ marginLeft: 8, background: "none", border: "none", color: "#111827", textDecoration: "underline" }}>
              {isSignup ? "Login" : "Create account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
