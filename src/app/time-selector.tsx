"use client";

import { useState, useCallback } from "react";
import { DateChips } from "./date-chips";
import { TimeBar } from "./time-bar";
import { TimeList } from "./time-list";
import { GCalButton } from "./gcal";
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
  onPrev: () => void;
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
  onPrev,
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

  const activeDate = dates[activeIndex];
  const selectedSlots = availability[activeDate] ?? [];

  const handleSlotsChange = useCallback(
    (slots: string[]) => {
      setAvailability((prev) => ({
        ...prev,
        [activeDate]: slots,
      }));
      onSave(activeDate, slots);
    },
    [activeDate, onSave],
  );

  const handleSkip = useCallback(() => {
    setAvailability((prev) => ({
      ...prev,
      [activeDate]: [],
    }));
    onSave(activeDate, []);

    if (activeIndex < dates.length - 1) {
      const next = activeIndex + 1;
      setActiveIndex(next);
      if (controlledDateChange) {
        controlledDateChange(dates[next]);
      }
    }
  }, [activeDate, activeIndex, dates, onSave, setActiveIndex, controlledDateChange]);

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

  const handleNext = useCallback(() => {
    if (activeIndex < dates.length - 1) {
      const next = activeIndex + 1;
      setActiveIndex(next);
      if (controlledDateChange) {
        controlledDateChange(dates[next]);
      }
    }
  }, [activeIndex, dates, setActiveIndex, controlledDateChange]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      const prev = activeIndex - 1;
      setActiveIndex(prev);
      if (controlledDateChange) {
        controlledDateChange(dates[prev]);
      }
    }
  }, [activeIndex, dates, setActiveIndex, controlledDateChange]);

  const ranges = slotsToRanges(selectedSlots);
  const isLastDate = activeIndex === dates.length - 1;
  const isFirstDate = activeIndex === 0;

  const formattedDate = formatDateLong(activeDate);

  return (
    <div className="ts-wrap" style={{ padding: "28px 24px" }}>
      <div className="card" style={{ padding: "32px" }}>
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
          {formattedDate}
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

        <TimeBar
          selectedSlots={selectedSlots}
          startHour={startHour}
          endHour={endHour}
          conflicts={conflicts}
          onChange={handleSlotsChange}
        />

        <TimeList
          selectedSlots={selectedSlots}
          startHour={startHour}
          endHour={endHour}
          conflicts={conflicts}
          onChange={handleSlotsChange}
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
          <div className="ts-nav-row">
            <button
              className="btn btn-o"
              onClick={handlePrev}
              disabled={isFirstDate}
            >
              ← Sebelumnya
            </button>
            {isLastDate ? (
              <button
                className="btn btn-p"
                onClick={onGoToReview ?? onNext}
              >
                Review →
              </button>
            ) : (
              <button className="btn btn-p" onClick={handleNext}>
                Lanjut →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
