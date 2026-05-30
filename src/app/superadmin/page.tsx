"use client";

import { useState, type FormEvent } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hashPassword } from "@/lib/hash";

const MASTER_KEY_HASH =
  "e14cb9e5c0eeee0ea313a4e04fbd10aa17ac17aa33a3cad4bdfe74b87ca18ef8";

interface AdminEntry {
  uid: string;
  email: string;
}

interface Toast {
  id: number;
  msg: string;
  type: "ok" | "err";
  hide: boolean;
}

export default function SuperAdminPage() {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<AdminEntry | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [checkingKey, setCheckingKey] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type, hide: false }]);
    setTimeout(
      () => setToasts((p) => p.map((t) => (t.id === id ? { ...t, hide: true } : t))),
      2500,
    );
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  };

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setCheckingKey(true);
    const hashed = await hashPassword(key);

    let storedHash = "";
    try {
      const snap = await getDoc(doc(db, "system_config", "admin_creds"));
      if (snap.exists()) {
        storedHash = snap.data().masterKeyHash ?? "";
      }
    } catch {
      // Firestore fetch failed — fall back to hardcoded hash
    }

    const validHash = storedHash || MASTER_KEY_HASH;

    if (hashed === validHash) {
      setUnlocked(true);
      loadAdmins();
      showToast("Akses diberikan.", "ok");
    } else {
      showToast("Master key salah!", "err");
    }
    setCheckingKey(false);
  };

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.users);
      } else {
        showToast(data.error ?? "Gagal memuat admin.", "err");
      }
    } catch {
      showToast("Gagal terhubung ke server.", "err");
    }
    setLoadingAdmins(false);
  };

  const addAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPass) return;

    const normalized = newEmail.trim().toLowerCase();
    if (admins.some((a) => a.email.toLowerCase() === normalized)) {
      showToast("Email sudah terdaftar!", "err");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, password: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Admin berhasil ditambahkan!", "ok");
        loadAdmins();
        setNewEmail("");
        setNewPass("");
      } else {
        showToast(data.error ?? "Gagal menambah admin.", "err");
      }
    } catch {
      showToast("Gagal terhubung ke server.", "err");
    }
  };

  const deleteAdmin = async (target: AdminEntry) => {
    try {
      const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(target.uid)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAdmins((prev) => prev.filter((a) => a.uid !== target.uid));
        showToast("Admin dihapus.", "ok");
      } else {
        const data = await res.json();
        showToast(data.error ?? "Gagal menghapus admin.", "err");
      }
    } catch {
      showToast("Gagal terhubung ke server.", "err");
    }
    setConfirmTarget(null);
  };

  if (!unlocked) {
    return (
      <>
        <ToastContainer toasts={toasts} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 20,
          }}
        >
          <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
            <div
              className="card-badge"
              style={{ color: "var(--red)", background: "var(--red-pale)", padding: "4px 10px", borderRadius: 20 }}
            >
              Restricted Area
            </div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 500,
                marginBottom: 24,
                color: "var(--text)",
              }}
            >
              Super Admin
            </h1>
            <form
              onSubmit={unlock}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <input
                type="password"
                className="input"
                placeholder="Master Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                style={{ textAlign: "center" }}
                autoFocus
              />
              <button disabled={checkingKey} className="btn btn-p" style={{ width: "100%" }}>
                {checkingKey ? "Memverifikasi..." : "Unlock"}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} />
      {confirmTarget && (
        <ConfirmDialog
          message={`Hapus admin "${confirmTarget.email}" dari sistem?`}
          onConfirm={() => deleteAdmin(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 20,
        }}
      >
        <div className="card" style={{ maxWidth: 440 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 500,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Kelola Admin
          </h1>
          <div className="admin-list">
            {loadingAdmins ? (
              <div className="admin-empty">Memuat...</div>
            ) : admins.length === 0 ? (
              <div className="admin-empty">Belum ada admin. Buat di bawah.</div>
            ) : (
              admins.map((a) => (
                <div key={a.uid} className="admin-item">
                  <div>
                    <div className="admin-name">{a.email}</div>
                  </div>
                  <button
                    onClick={() => setConfirmTarget(a)}
                    className="btn btn-r"
                  >
                    Hapus
                  </button>
                </div>
              ))
            )}
          </div>
          <hr className="divider" />
          <label className="form-label">Tambah Admin Baru</label>
          <form onSubmit={addAdmin}>
            <div className="form-row">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
                placeholder="Email"
                type="email"
                required
              />
              <input
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="input"
                placeholder="Password"
                type="password"
                required
              />
            </div>
            <button className="btn btn-p" style={{ width: "100%" }}>
              Simpan Admin
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type} ${t.hide ? "hide" : ""}`}
        >
          <span>{t.type === "ok" ? "✓" : "!"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-msg">{message}</div>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Batal
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
