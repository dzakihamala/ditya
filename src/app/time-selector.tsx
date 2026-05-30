"use client";

import { useState, useCallback } from "react";
import { DateChips } from "./date-chips";
import { TimeBar } from "./time-bar";
import { TimeList } from "./time-list";
import { GCalButton } from "./gcal";
import { slotsToRanges, getDateChipStatus } from "@/lib/time-selector";

interface TimeSelectorProps {
  meetingId: string;
  dates: string[];
  startHour: number;
  endHour: number;
  initialAvailability: Record<string, string[]>;
  onSave: (date: string, slots: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function TimeSelector({
  dates,
  startHour,
  endHour,
  initialAvailability,
  onSave,
  onNext,
  onPrev,
}: TimeSelectorProps) {
  const [availability, setAvailability] = useState<
    Record<string, string[]>
  >(initialAvailability);

  const [activeIndex, setActiveIndex] = useState(() => {
    const firstPending = dates.findIndex(
      (d) => getDateChipStatus(d, initialAvailability, d) !== "filled",
    );
    return firstPending >= 0 ? firstPending : 0;
  });

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
      setActiveIndex((i) => i + 1);
    }
  }, [activeDate, activeIndex, dates.length, onSave]);

  const handleDateChange = useCallback(
    (date: string) => {
      const idx = dates.indexOf(date);
      if (idx >= 0) {
        setActiveIndex(idx);
      }
    },
    [dates],
  );

  const handleNext = useCallback(() => {
    if (activeIndex < dates.length - 1) {
      setActiveIndex((i) => i + 1);
    }
  }, [activeIndex, dates.length]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }
  }, [activeIndex]);

  const ranges = slotsToRanges(selectedSlots);
  const isLastDate = activeIndex === dates.length - 1;
  const isFirstDate = activeIndex === 0;

  const formattedDate = (() => {
    const d = new Date(activeDate + "T00:00:00");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  })();

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

        <DateChips
          dates={dates}
          availability={availability}
          activeDate={activeDate}
          onDateChange={handleDateChange}
        />

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

        <div className="ts-nav-row">
          <button
            className="btn btn-o"
            onClick={handlePrev}
            disabled={isFirstDate}
          >
            ← Sebelumnya
          </button>
          {isLastDate ? (
            <button className="btn btn-p" onClick={onNext}>
              Review →
            </button>
          ) : (
            <button className="btn btn-p" onClick={handleNext}>
              Lanjut →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
