"use client";

import { useRef, useState, useCallback } from "react";
import {
  generateSlots,
  pixelToTime,
  timeToPixel,
  selectRange,
  deselectRange,
  isSlotSelected,
} from "@/lib/time-selector";

interface TimeBarProps {
  selectedSlots: string[];
  startHour: number;
  endHour: number;
  conflicts: string[];
  onChange: (slots: string[]) => void;
  barWidth?: number;
}

export function TimeBar({
  selectedSlots,
  startHour,
  endHour,
  conflicts,
  onChange,
  barWidth = 540,
}: TimeBarProps) {
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  const touchedRef = useRef<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);

  const slots = generateSlots(startHour, endHour);
  const totalSlots = slots.length;
  const slotWidth = barWidth / totalSlots;

  const getEventForSlot = useCallback(
    (time: string) => {
      if (!conflicts.includes(time)) return null;
      return "Ada acara di Google Calendar";
    },
    [conflicts],
  );

  const resolveTime = useCallback(
    (clientX: number): string => {
      if (!trackRef.current) return slots[0];
      const rect = trackRef.current.getBoundingClientRect();
      const pixel = clientX - rect.left;
      return pixelToTime(pixel, startHour, endHour, barWidth);
    },
    [startHour, endHour, barWidth, slots],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const time = resolveTime(e.clientX);
      const inSelectMode = !isSlotSelected(selectedSlots, time);
      setDragMode(inSelectMode ? "select" : "deselect");
      setDragStart(time);
      setDragging(true);
      touchedRef.current = new Set([time]);

      const updated = inSelectMode
        ? selectRange(selectedSlots, time, time)
        : deselectRange(selectedSlots, time, time);
      onChange(updated);
    },
    [selectedSlots, onChange, resolveTime],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const time = resolveTime(e.clientX);
      setHoveredSlot(time);

      if (!dragging || !dragStart) return;
      if (touchedRef.current.has(time)) return;
      touchedRef.current.add(time);

      const updated =
        dragMode === "select"
          ? selectRange(selectedSlots, dragStart, time)
          : deselectRange(selectedSlots, dragStart, time);
      onChange(updated);
    },
    [dragging, dragStart, dragMode, selectedSlots, onChange, resolveTime],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
    touchedRef.current = new Set();
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSlot(null);
    setHoveredEvent(null);
    if (dragging) {
      setDragging(false);
      setDragStart(null);
      touchedRef.current = new Set();
    }
  }, [dragging]);

  const hourLabels: string[] = [];
  let h = Math.floor(startHour);
  const endH = Math.ceil(endHour);
  while (h <= endH) {
    const labelH = h % 24;
    hourLabels.push(
      `${String(labelH).padStart(2, "0")}:00`,
    );
    h++;
  }

  return (
    <div className="time-bar">
      <div className="time-bar-labels">
        {hourLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div
        ref={trackRef}
        className="time-bar-track"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ width: barWidth, maxWidth: "100%" }}
      >
        {slots.map((time, i) => {
          const isSelected = isSlotSelected(selectedSlots, time);
          const isConflict = conflicts.includes(time);
          const isHourMark = time.endsWith(":00");

          let className = "time-bar-slot";
          if (isHourMark) className += " hour-mark";
          else className += " half-mark";
          if (isSelected) className += " sel";
          if (isConflict) className += " conflict";

          return (
            <div
              key={time}
              className={className}
              style={{ minWidth: slotWidth }}
              onMouseEnter={() => {
                setHoveredSlot(time);
                if (isConflict) setHoveredEvent(getEventForSlot(time));
              }}
            />
          );
        })}
      </div>

      {hoveredSlot && conflicts.includes(hoveredSlot) && hoveredEvent && (
        <div
          className="gcal-tooltip"
          style={{
            left: timeToPixel(hoveredSlot, startHour, endHour, barWidth) +
              slotWidth / 2,
            top: 48,
          }}
        >
          <div className="gcal-tooltip-name">{hoveredEvent}</div>
          <div className="gcal-tooltip-hint">Slot tetap bisa dipilih</div>
        </div>
      )}

      <div className="time-bar-legend">
        <span>
          <span className="time-bar-legend-swatch sel-swatch" /> Terpilih
        </span>
        {conflicts.length > 0 && (
          <span>
            <span className="time-bar-legend-swatch conflict-swatch" /> GCal
          </span>
        )}
      </div>
    </div>
  );
}
