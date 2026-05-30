"use client";

import { getDateChipStatus, type DateChipStatus } from "@/lib/time-selector";

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const STATUS_CLASS: Record<DateChipStatus, string> = {
  active: "active",
  filled: "filled",
  skipped: "skipped",
  pending: "",
};

interface DateChipsProps {
  dates: string[];
  availability: Record<string, string[]>;
  activeDate: string;
  onDateChange: (date: string) => void;
}

export function DateChips({
  dates,
  availability,
  activeDate,
  onDateChange,
}: DateChipsProps) {
  return (
    <div className="ts-dates">
      {dates.map((date) => {
        const status = getDateChipStatus(date, availability, activeDate);
        const d = new Date(date + "T00:00:00");
        const dayName = DAY_NAMES[d.getDay()];
        const dayNum = d.getDate();
        const month = d.getMonth() + 1;

        return (
          <button
            key={date}
            className={`ts-date-chip${STATUS_CLASS[status] ? " " + STATUS_CLASS[status] : ""}`}
            onClick={() => onDateChange(date)}
          >
            <span className="tsdc-day">
              {dayName} {dayNum}/{month}
            </span>
            <span className="tsdc-num">
              {status === "skipped" ? "✗" : status === "filled" ? "✓" : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
