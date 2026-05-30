"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { normalizeName } from "@/lib/participant";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

type Meeting = { eventName: string };

type ExistingParticipant = {
  id: string;
  displayName: string;
  deviceInfo: { os: string; browser: string };
  createdAt: string;
};

type Step = "loading" | "input" | "checking" | "duplicate" | "new-name" | "done";

export function ParticipantLanding({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("loading");
  const [existing, setExisting] = useState<ExistingParticipant | null>(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const snap = await getDoc(doc(db, "meetings", meetingId));
        if (!snap.exists()) {
          setError("Rapat tidak ditemukan atau sudah dihapus.");
          return;
        }
        setMeeting({ eventName: snap.data().eventName ?? "Tanpa Judul" });
        setStep("input");
      } catch {
        setError("Gagal memuat data rapat. Periksa koneksi Anda.");
      }
    };
    fetchMeeting();
  }, [meetingId]);

  const checkDuplicate = useCallback(
    async (inputName: string) => {
      const trimmed = inputName.trim();
      if (!trimmed) return;

      setStep("checking");
      const nameUpper = normalizeName(trimmed);

      try {
        const q = query(
          collection(db, "meetings", meetingId, "participants"),
          where("name", "==", nameUpper),
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          setExisting({
            id: doc.id,
            displayName: data.displayName ?? trimmed,
            deviceInfo: data.deviceInfo ?? { os: "Unknown", browser: "Unknown" },
            createdAt: data.createdAt ?? "",
          });
          setStep("duplicate");
        } else {
          setStep("done");
        }
      } catch {
        setError("Gagal memeriksa data. Coba lagi.");
        setStep("input");
      }
    },
    [meetingId],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkDuplicate(name);
  };

  const handleYes = () => {
    if (existing) {
      sessionStorage.setItem(
        `participant:${meetingId}`,
        JSON.stringify({ id: existing.id, name: existing.displayName }),
      );
    }
    setError(null);
  };

  const handleNo = () => {
    setName("");
    setExisting(null);
    setStep("new-name");
  };

  if (error && step !== "duplicate") {
    return (
      <div className="wizard-wrap">
        <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
          <div className="card-badge" style={{ color: "var(--red)" }}>
            Error
          </div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="loading" role="status">
        <div className="spinner" />
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Memuat...
        </p>
      </div>
    );
  }

  return (
    <div className="wizard-wrap">
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="card-badge">Langkah 1 — Nama</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            marginBottom: 6,
            color: "var(--text)",
          }}
        >
          {meeting?.eventName ?? "Undangan Rapat"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
          Silakan masukkan nama Anda untuk melanjutkan.
        </p>

        {/* Name input state */}
        {(step === "input" || step === "new-name") && (
          <form onSubmit={handleSubmit}>
            <label className="form-label">Nama Anda</label>
            <input
              className="input"
              type="text"
              placeholder="Ketik nama lengkap..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            {step === "new-name" && (
              <div
                className="err-box"
                style={{ marginTop: 12, marginBottom: 0 }}
              >
                Silakan gunakan nama yang berbeda.
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <button
                className="btn btn-p"
                type="submit"
                disabled={!name.trim()}
                style={{ width: "100%" }}
              >
                Lanjutkan
              </button>
            </div>
          </form>
        )}

        {/* Checking state */}
        {step === "checking" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Memeriksa data...
            </p>
          </div>
        )}

        {/* Duplicate found state */}
        {step === "duplicate" && existing && (
          <div>
            <div
              style={{
                background: "var(--green-pale)",
                border: "1px solid var(--green)",
                borderRadius: 8,
                padding: "14px 16px",
                marginBottom: 8,
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text)",
                  marginBottom: 6,
                }}
              >
                Sepertinya <strong>{existing.displayName}</strong> sudah
                mengisi pada{" "}
                {existing.createdAt
                  ? new Date(existing.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "waktu sebelumnya"}
                {" · "}
                {existing.deviceInfo.os} · {existing.deviceInfo.browser}
              </p>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Apakah ini Anda?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-p"
                onClick={handleYes}
                style={{ flex: 1 }}
              >
                Ya, itu saya
              </button>
              <button
                className="btn btn-o"
                onClick={handleNo}
                style={{ flex: 1 }}
              >
                Bukan saya
              </button>
            </div>
          </div>
        )}

        {/* Done state - no duplicate */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--green-pale)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                fontSize: 20,
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}>
              Hai, <strong>{name.trim()}</strong>!
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Data Anda siap. Langkah selanjutnya adalah memilih waktu
              ketersediaan.
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 16,
                fontFamily: "var(--font-mono)",
              }}
            >
              (Time Selector akan hadir di issue berikutnya)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
