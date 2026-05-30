"use client";

import { useState, useMemo } from "react";
import {
  generateSlots,
  selectRange,
  deselectRange,
  slotsToRanges,
  subtract30Minutes,
} from "@/lib/time-selector";

interface TimeRangePickerProps {
  selectedSlots: string[];
  startHour: number;
  endHour: number;
  conflicts: string[];
  onChange: (slots: string[]) => void;
}

export function TimeRangePicker({
  selectedSlots,
  startHour,
  endHour,
  conflicts,
  onChange,
}: TimeRangePickerProps) {
  const hourOptions: number[] = [];
  for (let h = Math.floor(startHour); h < Math.ceil(endHour); h++) {
    hourOptions.push(h);
  }

  const [fromHour, setFromHour] = useState(Math.floor(startHour));
  const [fromMin, setFromMin] = useState(0);
  const [toHour, setToHour] = useState(Math.min(Math.floor(startHour) + 1, Math.ceil(endHour) - 1));
  const [toMin, setToMin] = useState(0);

  const fromTime = `${String(fromHour).padStart(2, "0")}:${String(fromMin).padStart(2, "0")}`;
  const toTime = `${String(toHour).padStart(2, "0")}:${String(toMin).padStart(2, "0")}`;

  const ranges = useMemo(() => slotsToRanges(selectedSlots), [selectedSlots]);

  const allSlots = useMemo(() => generateSlots(startHour, endHour), [startHour, endHour]);

  const rangeHasConflict = (start: string, end: string) => {
    for (const slot of allSlots) {
      if (slot >= start && slot < end && conflicts.includes(slot)) return true;
    }
    return false;
  };

  const handleAddRange = () => {
    if (fromTime >= toTime) return;
    const lastSlot = subtract30Minutes(toTime);
    const updated = selectRange(selectedSlots, fromTime, lastSlot);
    onChange(updated);
  };

  const handleRemoveRange = (start: string, end: string) => {
    const lastSlot = subtract30Minutes(end);
    const updated = deselectRange(selectedSlots, start, lastSlot);
    onChange(updated);
  };

  const handleSeharian = () => {
    const sh = Math.floor(startHour);
    const eh = Math.ceil(endHour);
    const dayStart = `${String(sh % 24).padStart(2, "0")}:00`;
    const dayEnd = `${String(eh % 24).padStart(2, "0")}:00`;
    const lastSlot = subtract30Minutes(dayEnd);
    const updated = selectRange(selectedSlots, dayStart, lastSlot);
    onChange(updated);
  };

  const addDisabled = fromTime >= toTime;

  return (
    <div className="trp-wrap">
      <div className="time-range">
        <div className="time-picker">
          <span className="time-picker-label">Dari jam</span>
          <div className="time-picker-selects">
            <select
              className="input time-select"
              value={fromHour}
              onChange={(e) => setFromHour(Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="time-sep">:</span>
            <select
              className="input time-select"
              value={fromMin}
              onChange={(e) => setFromMin(Number(e.target.value))}
            >
              <option value={0}>00</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>

        <span className="time-range-dash">—</span>

        <div className="time-picker">
          <span className="time-picker-label">Sampai jam</span>
          <div className="time-picker-selects">
            <select
              className="input time-select"
              value={toHour}
              onChange={(e) => setToHour(Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="time-sep">:</span>
            <select
              className="input time-select"
              value={toMin}
              onChange={(e) => setToMin(Number(e.target.value))}
            >
              <option value={0}>00</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>
      </div>

      <div className="trp-actions">
        <button
          className="btn btn-o"
          onClick={handleSeharian}
          style={{ fontSize: 12 }}
        >
          Seharian
        </button>
        <button
          className="btn btn-p"
          onClick={handleAddRange}
          disabled={addDisabled}
          style={{ fontSize: 12 }}
        >
          + Tambah
        </button>
      </div>

      {ranges.length > 0 && (
        <div className="trp-chips">
          {ranges.map((r, i) => {
            const hasConflict = rangeHasConflict(r.start, r.end);
            return (
              <button
                key={`${r.start}-${r.end}-${i}`}
                className={`trp-chip${hasConflict ? " conflict" : ""}`}
                onClick={() => handleRemoveRange(r.start, r.end)}
                title="Klik untuk menghapus"
              >
                <span>
                  {r.start}–{r.end}
                </span>
                <span className="trp-chip-x">×</span>
              </button>
            );
          })}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="time-hint">
          ⚡ Slot dengan garis memiliki acara di Google Calendar. Tetap bisa dipilih.
        </div>
      )}
    </div>
  );
}
