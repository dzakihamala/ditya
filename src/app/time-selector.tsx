"use client";

import { useState, useCallback } from "react";
import { DateChips } from "./date-chips";
import { TimeGrid } from "./time-grid";
import { GCalButton } from "./gcal";
import { TutorialOverlay } from "./tutorial-overlay";
import { slotsToRanges, getDateChipStatus } from "@/lib/time-selector";
import { formatDateLong } from "@/lib/date-utils";

interface TimeSelectorProps {
  meetingId: string;
  dates: string[];
  startHour: number;
  endHour: number;
  initialAvailability: Record<string, string[]>;
  onSave: (date: string, slots: string[]) => void;
  onNext: () => void;
  activeDateIndex?: number;
  onDateChange?: (date: string) => void;
  onGoToReview?: () => void;
  modifyDate?: string;
  onModifyDone?: () => void;
}

export function TimeSelector({
  dates,
  startHour,
  endHour,
  initialAvailability,
  onSave,
  onNext,
  activeDateIndex: controlledIndex,
  onDateChange: controlledDateChange,
  onGoToReview,
  modifyDate,
  onModifyDone,
}: TimeSelectorProps) {
  const [availability, setAvailability] = useState<
    Record<string, string[]>
  >(initialAvailability);

  const [internalIndex, setInternalIndex] = useState(() => {
    if (modifyDate) return dates.indexOf(modifyDate);
    const firstPending = dates.findIndex(
      (d) => getDateChipStatus(d, initialAvailability, d) !== "filled",
    );
    return firstPending >= 0 ? firstPending : 0;
  });

  const activeIndex = controlledIndex ?? internalIndex;
  const setActiveIndex = useCallback(
    (idx: number) => {
      if (controlledIndex === undefined) {
        setInternalIndex(idx);
      }
    },
    [controlledIndex],
  );

  const [conflicts, setConflicts] = useState<string[]>([]);

  const activeDate = modifyDate ?? dates[activeIndex];
  const selectedSlots = availability[activeDate] ?? [];

  const handleGridChange = useCallback(
    (updates: Record<string, string[]>) => {
      setAvailability((prev) => {
        const next = { ...prev };
        for (const [date, slots] of Object.entries(updates)) {
          next[date] = slots;
        }
        return next;
      });
      for (const [date, slots] of Object.entries(updates)) {
        onSave(date, slots);
      }
    },
    [onSave],
  );

  const handleSkip = useCallback(() => {
    setAvailability((prev) => ({ ...prev, [activeDate]: [] }));
    onSave(activeDate, []);
  }, [activeDate, onSave]);

  const handleDateChipClick = useCallback(
    (date: string) => {
      const idx = dates.indexOf(date);
      if (idx >= 0) {
        setActiveIndex(idx);
        if (controlledDateChange) {
          controlledDateChange(date);
        }
      }
    },
    [dates, setActiveIndex, controlledDateChange],
  );

  // Build conflicts-per-date map from flat conflicts array
  const conflictsByDate: Record<string, string[]> = {};
  if (conflicts.length > 0) {
    const d = modifyDate ?? dates[activeIndex];
    conflictsByDate[d] = conflicts;
  }

  const ranges = slotsToRanges(selectedSlots);
  const formattedDate = formatDateLong(activeDate);

  return (
    <div className="ts-wrap" style={{ padding: "28px 24px" }}>
      <div className="card" style={{ padding: "32px", position: "relative" }}>
        <div className="card-badge">Langkah 2 — Ketersediaan</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            marginBottom: 4,
            color: "var(--text)",
          }}
        >
          Pilih waktu Anda
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
          {modifyDate ? formattedDate : "Klik dan seret pada grid untuk memilih waktu"}
        </p>

        {!modifyDate && (
          <DateChips
            dates={dates}
            availability={availability}
            activeDate={activeDate}
            onDateChange={handleDateChipClick}
          />
        )}

        <GCalButton
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          onConflictsChange={setConflicts}
        />

        <TimeGrid
          dates={modifyDate ? [modifyDate] : dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={conflictsByDate}
          onChange={handleGridChange}
        />

        {ranges.length > 0 && (
          <div className="ts-summary">
            {ranges.map((r, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {r.start}–{r.end}
              </span>
            ))}
          </div>
        )}

        <div className="ts-skip-row">
          <button
            className="btn btn-g"
            onClick={handleSkip}
            style={{ fontSize: 12 }}
          >
            Saya tidak bisa di hari ini
          </button>
        </div>

        {modifyDate ? (
          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-p"
              onClick={onModifyDone}
              style={{ width: "100%" }}
            >
              Simpan & Kembali ke Review
            </button>
          </div>
        ) : (
          <div className="ts-nav-row" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-p"
              onClick={onGoToReview ?? onNext}
            >
              Review →
            </button>
          </div>
        )}

        {!modifyDate && <TutorialOverlay storageKey="tutorial-seen" />}
      </div>
    </div>
  );
}
