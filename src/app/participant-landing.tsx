"use client";

import { useState, useEffect, useCallback, useReducer } from "react";
import { db } from "@/lib/firebase";
import { normalizeName, getDeviceInfo, createParticipant, saveParticipantAvailability, saveParticipantDateSlot } from "@/lib/participant";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { TimeSelector } from "./time-selector";
import { Review } from "./review";
import { DateChips } from "./date-chips";
import { formatDateLong } from "@/lib/date-utils";
import { useToast } from "@/lib/use-toast";
import {
  createInitialState,
  wizardReducer,
  getReviewItems,
} from "@/lib/wizard";

type ExistingParticipant = {
  id: string;
  displayName: string;
  deviceInfo: { os: string; browser: string };
  createdAt: string;
  availability?: Record<string, string[]>;
};

function formatAvailabilityLabel(
  status: "filled" | "skipped" | "pending",
  ranges: { start: string; end: string }[],
): string {
  if (status === "filled") return ranges.map((r) => `${r.start}–${r.end}`).join(", ");
  if (status === "skipped") return "Tidak bisa";
  return "Belum diisi";
}

export function ParticipantLanding({ meetingId }: { meetingId: string }) {
  const [wizard, dispatch] = useReducer(wizardReducer, createInitialState());
  const [name, setName] = useState("");
  const [existing, setExisting] = useState<ExistingParticipant | null>(null);
  const [showNewNameHint, setShowNewNameHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modifyShowPicker, setModifyShowPicker] = useState(false);
  const { toast, showToast } = useToast();

  // Load meeting data
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const snap = await getDoc(doc(db, "meetings", meetingId));
        if (!snap.exists()) {
          dispatch({
            type: "LOAD_MEETING_FAIL",
            error: "Rapat tidak ditemukan atau sudah dihapus.",
          });
          return;
        }
        const data = snap.data();
        dispatch({
          type: "LOAD_MEETING_OK",
          meetingTitle: data.eventName ?? "Tanpa Judul",
          dates: data.dates ?? [],
          startHour: data.startHour ?? 8,
          endHour: data.endHour ?? 17,
        });
      } catch {
        dispatch({
          type: "LOAD_MEETING_FAIL",
          error: "Gagal memuat data rapat. Periksa koneksi Anda.",
        });
      }
    };
    fetchMeeting();
  }, [meetingId]);

  const checkDuplicate = useCallback(
    async (inputName: string) => {
      const trimmed = inputName.trim();
      if (!trimmed) return;

      dispatch({ type: "SET_ERROR", error: "checking" });

      try {
        const q = query(
          collection(db, "meetings", meetingId, "participants"),
          where("name", "==", normalizeName(trimmed)),
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          setExisting({
            id: docSnap.id,
            displayName: data.displayName ?? trimmed,
            deviceInfo: data.deviceInfo ?? { os: "Unknown", browser: "Unknown" },
            createdAt: data.createdAt ?? "",
            availability: data.availability ?? {},
          });
          dispatch({ type: "CLEAR_ERROR" });
        } else {
          await startNewParticipant(trimmed);
        }
      } catch {
        dispatch({
          type: "SET_ERROR",
          error: "Gagal memeriksa data. Coba lagi.",
        });
      }
    },
    [meetingId],
  );

  const startNewParticipant = async (displayName: string) => {
    try {
      const id = await createParticipant(db, meetingId, {
        name: displayName,
        displayName,
        deviceInfo: getDeviceInfo(),
      });
      sessionStorage.setItem(
        `participant:${meetingId}`,
        JSON.stringify({ id, name: displayName }),
      );
      dispatch({
        type: "NAME_CONFIRMED",
        displayName,
        participantId: id,
      });
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Gagal menyimpan data. Coba lagi.",
      });
    }
  };

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
      dispatch({
        type: "START_MODIFY",
        displayName: existing.displayName,
        participantId: existing.id,
        availability: existing.availability ?? {},
      });
    }
  };

  const handleNo = () => {
    setExisting(null);
    setShowNewNameHint(true);
  };

  const handleSkipGcal = useCallback(() => {
    dispatch({ type: "SKIP_GCAL" });
  }, []);

  const handleGcalConnected = useCallback(() => {
    dispatch({ type: "GCAL_CONNECTED" });
  }, []);

  const handleSaveSlot = useCallback(
    async (date: string, slots: string[]) => {
      dispatch({ type: "UPDATE_SLOTS", date, slots });
      if (wizard.participantId) {
        const updated = { ...wizard.availability, [date]: slots };
        try {
          await saveParticipantAvailability(
            db,
            meetingId,
            wizard.participantId,
            updated,
          );
        } catch {
          // Firestore save failed silently — data is still in local state
        }
      }
    },
    [wizard.participantId, wizard.availability, meetingId],
  );

  const handleDateChange = useCallback(
    (date: string) => {
      const idx = wizard.dates.indexOf(date);
      if (idx >= 0) {
        dispatch({ type: "SET_DATE_INDEX", index: idx });
      }
    },
    [wizard.dates],
  );

  const handleNextDate = useCallback(() => {
    if (wizard.activeDateIndex < wizard.dates.length - 1) {
      dispatch({
        type: "SET_DATE_INDEX",
        index: wizard.activeDateIndex + 1,
      });
    }
  }, [wizard.activeDateIndex, wizard.dates.length]);

  const handleGoToReview = useCallback(() => {
    dispatch({ type: "GO_TO_REVIEW" });
  }, []);

  const handleEdit = useCallback((date: string) => {
    dispatch({ type: "GO_TO_EDIT", date });
  }, []);

  const handleModifySelectDate = useCallback((date: string) => {
    dispatch({ type: "MODIFY_SINGLE_DATE", date });
  }, []);

  const handleModifyResetAll = useCallback(() => {
    dispatch({ type: "MODIFY_RESET_ALL" });
    showToast("Jadwal diatur ulang dari awal.");
  }, []);

  const handleModifySaveSlot = useCallback(
    async (date: string, slots: string[]) => {
      dispatch({ type: "UPDATE_SLOTS", date, slots });
      if (wizard.participantId) {
        try {
          await saveParticipantDateSlot(
            db,
            meetingId,
            wizard.participantId,
            date,
            slots,
          );
          showToast("Jadwal berhasil diperbarui.");
        } catch {
          // Firestore save failed silently
        }
      }
    },
    [wizard.participantId, meetingId],
  );

  const handleModifyDone = useCallback(() => {
    dispatch({ type: "MODIFY_DONE" });
  }, []);

  const handleModifyAgain = useCallback(() => {
    if (wizard.isModifyMode) {
      dispatch({
        type: "START_MODIFY",
        displayName: wizard.displayName,
        participantId: wizard.participantId!,
        availability: wizard.availability,
      });
    } else {
      dispatch({
        type: "GO_TO_EDIT",
        date: wizard.dates[0] || "",
      });
    }
  }, [wizard.isModifyMode, wizard.displayName, wizard.participantId, wizard.availability, wizard.dates]);

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      if (wizard.participantId) {
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(
          doc(db, "meetings", meetingId, "participants", wizard.participantId),
          {
            confirmedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        );
      }
      dispatch({ type: "CONFIRM_SAVE" });
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Gagal menyimpan. Coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  }, [wizard.participantId, meetingId]);

  // ---- RENDER ----

  const checking = wizard.error === "checking";

  let content: React.ReactNode;

  if (wizard.error && wizard.step === "loading" && !checking) {
    content = (
      <div className="wizard-wrap">
        <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
          <div className="card-badge" style={{ color: "var(--red)" }}>
            Error
          </div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>{wizard.error}</p>
          <button
            className="btn btn-o"
            onClick={() => window.location.reload()}
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  } else if (wizard.step === "loading") {
    content = (
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
  } else if (wizard.step === "gcal") {
    // ---- STEP 2: GCal opt-in ----
    content = (
      <div className="wizard-wrap wizard-step" style={{ padding: "28px 24px" }}>
        <div className="card" style={{ maxWidth: 440, padding: "32px" }}>
          <div className="card-badge">Langkah 2 — Kalender</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              marginBottom: 8,
              color: "var(--text)",
            }}
          >
            Hubungkan Google Calendar
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
            Anda dapat menghubungkan Google Calendar untuk melihat acara yang
            bentrok saat memilih waktu. Slot yang bentrok akan ditampilkan
            sebagai informasi — Anda tetap bisa memilihnya.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="btn btn-g"
              onClick={handleGcalConnected}
              style={{ width: "100%" }}
            >
              Hubungkan Google Calendar
            </button>
            <button
              className="btn btn-o"
              onClick={handleSkipGcal}
              style={{ width: "100%" }}
            >
              Lewati
            </button>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 14,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            Anda bisa menghubungkan nanti di halaman pemilihan waktu.
          </p>
        </div>
      </div>
    );
  } else if (wizard.step === "modify") {
    // ---- MODIFY STEP: Modify flow entry ----
    const items = getReviewItems(wizard.availability, wizard.dates);
    content = (
      <div className="wizard-wrap wizard-step" style={{ padding: "28px 24px" }}>
        <div className="card" style={{ maxWidth: 520, padding: "32px" }}>
          <div className="card-badge">Ubah Jadwal</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              marginBottom: 2,
              color: "var(--text)",
            }}
          >
            Halo, {wizard.displayName}!
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            Ketersediaan Anda saat ini:
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {items.map((item) => (
              <div
                key={item.date}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background:
                    item.status === "filled"
                      ? "var(--green-pale)"
                      : item.status === "skipped"
                        ? "#fff7e6"
                        : "#fafafa",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                  {formatDateLong(item.date)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color:
                      item.status === "filled"
                        ? "var(--green)"
                        : item.status === "skipped"
                          ? "#d97706"
                          : "var(--muted)",
                  }}
                >
                  {formatAvailabilityLabel(item.status, item.ranges)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="btn btn-p"
              onClick={() => setModifyShowPicker(true)}
              style={{ width: "100%" }}
            >
              Ubah Hari Tertentu
            </button>
            <button
              className="btn btn-o"
              onClick={handleModifyResetAll}
              style={{ width: "100%" }}
            >
              Isi Ulang Semua dari Awal
            </button>
          </div>

          {modifyShowPicker && (
            <div style={{ marginTop: 20 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 10,
                }}
              >
                Pilih tanggal yang ingin diubah:
              </p>
              <DateChips
                dates={wizard.dates}
                availability={wizard.availability}
                activeDate={wizard.dates[0]}
                onDateChange={handleModifySelectDate}
              />
            </div>
          )}
        </div>
      </div>
    );
  } else if (wizard.step === "select-time" && wizard.dates.length > 0) {
    // ---- STEP 3: Select time ----
    const inModifyMode = wizard.isModifyMode;
    content = (
      <div className="wizard-step">
        <TimeSelector
          meetingId={meetingId}
          dates={wizard.dates}
          startHour={wizard.startHour}
          endHour={wizard.endHour}
          initialAvailability={wizard.availability}
          onSave={inModifyMode ? handleModifySaveSlot : handleSaveSlot}
          onNext={handleNextDate}
          onDateChange={handleDateChange}
          activeDateIndex={wizard.activeDateIndex}
          onGoToReview={inModifyMode ? undefined : handleGoToReview}
          modifyDate={inModifyMode ? wizard.dates[wizard.activeDateIndex] : undefined}
          onModifyDone={inModifyMode ? handleModifyDone : undefined}
        />
      </div>
    );
  } else if (wizard.step === "review") {
    // ---- STEP 4: Review ----
    const items = getReviewItems(wizard.availability, wizard.dates);
    content = (
      <div className="wizard-step">
        <Review
          items={items}
          displayName={wizard.displayName}
          onEdit={handleEdit}
          onSave={handleConfirm}
          saving={saving}
          error={wizard.error}
        />
      </div>
    );
  } else if (wizard.step === "saved") {
    // ---- STEP 5: Thank you ----
    content = (
      <div className="wizard-wrap wizard-step">
        <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
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
            Terima kasih, <strong>{wizard.displayName}</strong>!
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            Ketersediaan Anda telah disimpan.
          </p>
          <button
            className="btn btn-o"
            onClick={handleModifyAgain}
            style={{ fontSize: 13 }}
          >
            Ubah jadwal
          </button>
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 16,
              fontFamily: "var(--font-mono)",
            }}
          >
            Anda dapat menutup halaman ini.
          </p>
        </div>
      </div>
    );
  } else {
    // ---- STEP 1: Name input ----
    content = (
      <div className="wizard-wrap wizard-step">
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
            {wizard.meetingTitle || "Undangan Rapat"}
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
            Silakan masukkan nama Anda untuk melanjutkan.
          </p>

          {wizard.step === "input" && (
            <>
              {!existing ? (
                <form onSubmit={handleSubmit}>
                  <label className="form-label">Nama Anda</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ketik nama lengkap..."
                    value={name}
                    onChange={(e) => { setName(e.target.value); setShowNewNameHint(false); }}
                    autoFocus
                    required
                  />
                  {wizard.error && wizard.error !== "checking" && (
                    <div
                      className="err-box"
                      style={{ marginTop: 12, marginBottom: 0 }}
                    >
                      {wizard.error}
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <button
                      className="btn btn-p"
                      type="submit"
                      disabled={!name.trim() || checking}
                      style={{ width: "100%" }}
                    >
                      Lanjutkan
                    </button>
                  </div>
                </form>
              ) : (
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

              {checking && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    Memeriksa data...
                  </p>
                </div>
              )}
            </>
          )}

          {wizard.step === "input" && !existing && showNewNameHint && !checking && (
            <div
              className="err-box"
              style={{ marginTop: 12, marginBottom: 0 }}
            >
              Silakan gunakan nama yang berbeda.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {toast && (
        <div className="toast-wrap">
          <div className="toast ok">{toast}</div>
        </div>
      )}
    </>
  );
}
