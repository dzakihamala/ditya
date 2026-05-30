"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { AuthGuard } from "@/lib/AuthGuard";
import { db } from "@/lib/firebase";
import {
  createMeeting,
  getMeeting,
  updateMeeting,
} from "@/lib/meetings";
import {
  getMonthGrid,
  toggleDate,
  selectDateRange,
} from "@/lib/date-utils";
import { useToast } from "@/lib/use-toast";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function Calendar({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const dragging = dragStart !== null;

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const handleMouseDown = (date: string) => {
    setDragStart(date);
    setDragEnd(date);
  };

  const handleMouseEnter = (date: string) => {
    if (dragStart) setDragEnd(date);
  };

  useEffect(() => {
    if (!dragging) return;
    const handleUp = () => {
      if (dragStart && dragEnd) {
        if (dragStart === dragEnd) {
          onChange(toggleDate(selected, dragStart));
        } else {
          onChange(selectDateRange(selected, dragStart, dragEnd));
        }
      }
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [dragging, dragStart, dragEnd, selected, onChange]);

  const inDragRange = (date: string): boolean => {
    if (!dragStart || !dragEnd) return false;
    const s = new Date(dragStart + "T00:00:00");
    const e = new Date(dragEnd + "T00:00:00");
    const d = new Date(date + "T00:00:00");
    const [from, to] = s <= e ? [s, e] : [e, s];
    return d >= from && d <= to;
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear((prev) => prev - 1);
      setMonth(11);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear((prev) => prev + 1);
      setMonth(0);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={prevMonth} type="button">
          ‹
        </button>
        <span className="calendar-month">
          {MONTHS[month]} {year}
        </span>
        <button className="calendar-nav-btn" onClick={nextMonth} type="button">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {DAYS.map((d) => (
          <div key={d} className="calendar-day-header">
            {d}
          </div>
        ))}
        {grid.flat().map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="calendar-cell-empty" />;
          const isSel = selected.includes(date);
          const isToday = date === todayStr;
          const inDrag = inDragRange(date);
          return (
            <button
              key={date}
              type="button"
              className={`calendar-cell${isSel || inDrag ? " sel" : ""}${isToday ? " today" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown(date);
              }}
              onMouseEnter={() => handleMouseEnter(date)}
            >
              {parseInt(date.slice(-2), 10)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeUnitSelect({
  value,
  count,
  onChange,
}: {
  value: number;
  count: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      className="input time-select"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {Array.from({ length: count }, (_, i) => (
        <option key={i} value={i}>
          {String(i).padStart(2, "0")}
        </option>
      ))}
    </select>
  );
}

function EditorContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const meetingId = isNew ? null : params.id;

  const [name, setName] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!meetingId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    getMeeting(db, meetingId).then((m) => {
      if (cancelled) return;
      if (m) {
        setName(m.eventName);
        setDates(m.dates);
        setStartHour(m.startHour);
        setEndHour(m.endHour);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const valid =
    name.trim().length > 0 && dates.length > 0 && endHour > startHour;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const data = {
        eventName: name.trim(),
        dates,
        startHour,
        endHour,
      };
      if (isNew) {
        const id = await createMeeting(db, data);
        router.push(`/admin/meetings/${id}`);
      } else {
        await updateMeeting(db, meetingId!, data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    }
    setSaving(false);
  };

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  const broadcastLink = meetingId ? `${baseUrl}/?id=${meetingId}` : null;

  const copyLink = () => {
    if (!broadcastLink) return;
    navigator.clipboard.writeText(broadcastLink).then(() => {
      showToast("Link undangan tersalin!");
    }).catch(() => {});
  };

  if (!loaded) {
    return (
      <div className="loading" role="status">
        <div className="spinner" />
        <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Memuat...
        </p>
      </div>
    );
  }

  return (
    <div className="editor">
      <div className="editor-header">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-o"
            onClick={() => router.push("/admin/dashboard")}
            style={{ fontSize: 12 }}
          >
            ← Kembali
          </button>
          {!isNew && (
            <button
              className="btn btn-o"
              onClick={() => router.push(`/admin/meetings/${meetingId}/analysis`)}
              style={{ fontSize: 12 }}
            >
              Lihat Analisis
            </button>
          )}
        </div>
        <h1 className="editor-title">
          {isNew ? "Rapat Baru" : "Edit Rapat"}
        </h1>
        <div style={{ width: 80 }} />
      </div>

      <div className="editor-card">
        <div className="editor-cols">
          <div className="editor-col-left">
            <label className="form-label">Nama Rapat</label>
            <input
              className="input"
              type="text"
              placeholder="Misal: Rapat Koordinasi Tim"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <hr className="divider" />

            <label className="form-label">
              Tanggal Kandidat ({dates.length} dipilih)
            </label>
            <Calendar selected={dates} onChange={setDates} />

          </div>

          <div className="editor-col-right">
            <label className="form-label">Jam tersedia</label>
            <div className="time-range-inline">
              <TimeUnitSelect
                value={Math.floor(startHour)}
                count={24}
                onChange={(h) => {
                  const m = Math.round((startHour - Math.floor(startHour)) * 60);
                  const newStart = h + m / 60;
                  setStartHour(newStart);
                  if (newStart >= endHour) setEndHour(Math.min(newStart + 0.5, 23 + 59 / 60));
                }}
              />
              <span className="time-sep">:</span>
              <TimeUnitSelect
                value={Math.round((startHour - Math.floor(startHour)) * 60)}
                count={60}
                onChange={(m) => {
                  const newStart = Math.floor(startHour) + m / 60;
                  setStartHour(newStart);
                  if (newStart >= endHour) setEndHour(Math.min(newStart + 0.5, 23 + 59 / 60));
                }}
              />
              <span className="time-range-dash">—</span>
              <TimeUnitSelect
                value={Math.floor(endHour)}
                count={24}
                onChange={(h) => {
                  const m = Math.round((endHour - Math.floor(endHour)) * 60);
                  const newEnd = h + m / 60;
                  if (newEnd > startHour) setEndHour(newEnd);
                }}
              />
              <span className="time-sep">:</span>
              <TimeUnitSelect
                value={Math.round((endHour - Math.floor(endHour)) * 60)}
                count={60}
                onChange={(m) => {
                  const newEnd = Math.floor(endHour) + m / 60;
                  if (newEnd > startHour) setEndHour(newEnd);
                }}
              />
            </div>
            <div className="time-preview-bar">
              <div
                className="time-preview-fill"
                style={{
                  left: `${(startHour / 24) * 100}%`,
                  width: `${((endHour - startHour) / 24) * 100}%`,
                }}
              />
            </div>

            <hr className="divider" />

            {broadcastLink && (
              <>
                <label className="form-label">Link Undangan</label>
                <div className="broadcast-row">
                  <code className="broadcast-link">{broadcastLink}</code>
                  <button className="btn btn-p" onClick={copyLink} style={{ fontSize: 12 }}>
                    Salin
                  </button>
                </div>
                <hr className="divider" />
              </>
            )}

            {error && <div className="err-box">{error}</div>}
            <button
              className="btn btn-p"
              style={{ width: "100%", padding: 12, marginTop: error ? 12 : 0 }}
              disabled={!valid || saving}
              onClick={handleSave}
            >
              {saving ? "Menyimpan..." : isNew ? "Buat Rapat" : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast-wrap">
          <div className="toast ok">{toast}</div>
        </div>
      )}
    </div>
  );
}

export default function MeetingEditorPage() {
  return (
    <AuthGuard>
      <EditorContent />
    </AuthGuard>
  );
}
