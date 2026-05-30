"use client";

import { AuthGuard } from "@/lib/AuthGuard";
import { useAuth } from "@/lib/AuthContext";

export default function AdminDashboardPage() {
  const { signOut } = useAuth();

  return (
    <AuthGuard>
      <div className="dash">
        <div className="dash-header">
          <h1 className="dash-title">Dashboard Admin</h1>
          <button onClick={signOut} className="btn btn-g" style={{ fontSize: 12 }}>
            Logout
          </button>
        </div>
        <div className="dash-empty">
          Belum ada rapat. Fitur manajemen rapat akan hadir di iterasi berikutnya.
        </div>
      </div>
    </AuthGuard>
  );
}
