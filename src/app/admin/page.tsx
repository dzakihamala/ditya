"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push("/admin/dashboard");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login gagal.";
      if (message.includes("auth/invalid-credential")) {
        setError("Email atau password salah.");
      } else if (message.includes("auth/too-many-requests")) {
        setError("Terlalu banyak percobaan. Coba lagi nanti.");
      } else {
        setError(message);
      }
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{ maxWidth: 380, textAlign: "center" }}
      >
        <div className="card-badge" style={{ color: "var(--muted)" }}>
          Admin Panel
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            marginBottom: 24,
            color: "var(--text)",
          }}
        >
          Verdant Schedule
        </h1>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ textAlign: "center" }}
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ textAlign: "center" }}
          />
          <button
            disabled={loading}
            className="btn btn-p"
            style={{ width: "100%", padding: 12 }}
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>
        {error && <div className="err-box">{error}</div>}
      </div>
    </div>
  );
}
