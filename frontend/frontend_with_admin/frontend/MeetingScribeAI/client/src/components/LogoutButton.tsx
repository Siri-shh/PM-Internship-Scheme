import React from "react";
import { useAuth } from "@/lib/AuthProvider";

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      style={{
        padding: "8px 12px",
        background: "#dc2626",
        color: "white",
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
      }}
    >
      Logout
    </button>
  );
}
