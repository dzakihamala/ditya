"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading" role="status">
        <div className="spinner" />
        <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Memuat...
        </p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
