"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  floatToTimeStr,
  timeStrToFloat,
} from "@/lib/date-utils";
import type { Meeting } from "@/lib/types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/* ------------------------------------------------------------------ */
/*  Calendar                                                           */
/* ------------------------------------------------------------------ */

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
        onChange(selectDateRange(selected, dragStart, dragEnd));
      }
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [dragging, dragStart, dragEnd, selected, onChange]);

  const handleClick = (date: string) => {
    onChange(toggleDate(selected, date));
  };

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
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
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
              onClick={() => handleClick(date)}
            >
              {parseInt(date.slice(-2), 10)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time Picker                                                        */
/* ------------------------------------------------------------------ */

function TimePicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);

  return (
    <div className="time-picker">
      <span className="time-picker-label">{label}</span>
      <div className="time-picker-selects">
        <select
          className="input time-select"
          value={h}
          onChange={(e) => onChange(Number(e.target.value) + m / 60)}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span className="time-sep">:</span>
        <select
          className="input time-select"
          value={m}
          onChange={(e) => onChange(h + Number(e.target.value) / 60)}
        >
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor Page                                                        */
/* ------------------------------------------------------------------ */

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
    navigator.clipboard.writeText(broadcastLink).catch(() => {});
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
        <button
          className="btn btn-o"
          onClick={() => router.push("/admin/dashboard")}
          style={{ fontSize: 12 }}
        >
          ← Kembali
        </button>
        <h1 className="editor-title">
          {isNew ? "Rapat Baru" : "Edit Rapat"}
        </h1>
        <div style={{ width: 80 }} />
      </div>

      <div className="editor-card">
        {/* Name */}
        <label className="form-label">Nama Rapat</label>
        <input
          className="input"
          type="text"
          placeholder="Misal: Rapat Koordinasi Tim"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <hr className="divider" />

        {/* Dates */}
        <label className="form-label">
          Tanggal Kandidat ({dates.length} dipilih)
        </label>
        <Calendar selected={dates} onChange={setDates} />

        {dates.length > 0 && (
          <div className="selected-dates">
            {dates.map((d) => (
              <span key={d} className="date-chip">
                {d.split("-").reverse().join("/")}
                <button
                  className="date-chip-x"
                  onClick={() =>
                    setDates((prev) => prev.filter((x) => x !== d))
                  }
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <hr className="divider" />

        {/* Time */}
        <label className="form-label">Rentang Jam</label>
        <div className="time-range">
          <TimePicker
            label="Mulai"
            value={startHour}
            onChange={(v) => {
              setStartHour(v);
              if (v >= endHour) setEndHour(Math.min(v + 0.5, 23.98));
            }}
          />
          <span className="time-range-dash">—</span>
          <TimePicker
            label="Selesai"
            value={endHour}
            onChange={(v) => {
              if (v > startHour) setEndHour(v);
            }}
          />
        </div>
        <p className="time-hint">
          {floatToTimeStr(startHour)} – {floatToTimeStr(endHour)} (
          {Math.round((endHour - startHour) * 60)} menit)
        </p>

        <hr className="divider" />

        {/* Broadcast link */}
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

        {/* Error & Save */}
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
  );
}

export default function MeetingEditorPage() {
  return (
    <AuthGuard>
      <EditorContent />
    </AuthGuard>
  );
}
