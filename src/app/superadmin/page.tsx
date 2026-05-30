"use client";

import { useState, type FormEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hashPassword } from "@/lib/hash";

const MASTER_KEY_HASH =
  "e14cb9e5c0eeee0ea313a4e04fbd10aa17ac17aa33a3cad4bdfe74b87ca18ef8";

interface AdminUser {
  u: string;
  p: string;
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
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [checkingKey, setCheckingKey] = useState(false);

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
    try {
      const snap = await getDoc(doc(db, "system_config", "admin_creds"));
      if (snap.exists()) setAdmins(snap.data().users ?? []);
    } catch {
      showToast("Gagal memuat data admin.", "err");
    }
  };

  const addAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUser || !newPass) return;

    if (admins.some((a) => a.u.toLowerCase() === newUser.trim().toLowerCase())) {
      showToast("Username sudah ada!", "err");
      return;
    }

    const hashedP = await hashPassword(newPass);
    const updated = [...admins, { u: newUser.trim(), p: hashedP }];
    await setDoc(doc(db, "system_config", "admin_creds"), {
      users: updated,
      masterKeyHash: MASTER_KEY_HASH,
    });
    setAdmins(updated);
    setNewUser("");
    setNewPass("");
    showToast("Admin berhasil ditambahkan!", "ok");
  };

  const deleteAdmin = async (username: string) => {
    const updated = admins.filter((a) => a.u !== username);
    await setDoc(doc(db, "system_config", "admin_creds"), {
      users: updated,
      masterKeyHash: MASTER_KEY_HASH,
    });
    setAdmins(updated);
    setConfirmTarget(null);
    showToast("Admin dihapus.", "ok");
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
          message={`Hapus admin "${confirmTarget}" dari sistem?`}
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
            {admins.length === 0 ? (
              <div className="admin-empty">Belum ada admin. Buat di bawah.</div>
            ) : (
              admins.map((a) => (
                <div key={a.u} className="admin-item">
                  <div>
                    <div className="admin-name">{a.u}</div>
                    <div className="admin-pass">
                      {a.p.length > 20 ? "••••••••" : a.p}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmTarget(a.u)}
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
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                className="input"
                placeholder="Username"
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
