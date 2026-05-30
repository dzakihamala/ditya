"use client";

import { generateSlots, toggleSlot, isSlotSelected } from "@/lib/time-selector";

interface TimeListProps {
  selectedSlots: string[];
  startHour: number;
  endHour: number;
  conflicts: string[];
  onChange: (slots: string[]) => void;
}

export function TimeList({
  selectedSlots,
  startHour,
  endHour,
  conflicts,
  onChange,
}: TimeListProps) {
  const slots = generateSlots(startHour, endHour);

  const handleToggle = (time: string) => {
    onChange(toggleSlot(selectedSlots, time));
  };

  return (
    <div className="time-list-wrap">
      <div className="time-list">
        {slots.map((time) => {
          const isSelected = isSlotSelected(selectedSlots, time);
          const isConflict = conflicts.includes(time);

          let rowClass = "time-list-row";
          if (isConflict) rowClass += " conflict";

          let indicatorClass = "time-list-indicator";
          if (isSelected) indicatorClass += " sel";

          return (
            <div
              key={time}
              className={rowClass}
              onClick={() => handleToggle(time)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggle(time);
                }
              }}
            >
              <span className="time-list-time">{time}</span>
              <span className={indicatorClass}>
                {isSelected ? "✓" : ""}
              </span>
              {isConflict && <span className="time-list-gcal-dot" title="Ada acara di Google Calendar. Slot tetap bisa dipilih." />}
            </div>
          );
        })}
      </div>

      {conflicts.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          ⚡ Slot dengan titik kuning memiliki acara di Google Calendar. Tetap bisa dipilih.
        </div>
      )}
    </div>
  );
}
