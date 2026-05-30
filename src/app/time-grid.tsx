"use client";

import { useRef, useState, useCallback } from "react";
import {
  generateSlots,
  gridPixelToSlot,
  getBlocks,
  selectRange,
  deselectRange,
  add30Minutes,
  subtract30Minutes,
  timeToMinutes,
  slotsInTimeRange,
} from "@/lib/time-selector";

const CELL_HEIGHT = 28;
const COL_WIDTH = 80;
const TIME_LABEL_WIDTH = 52;
const BLOCK_PAD = 2;
const EDGE_HIT = 8;

interface TimeGridProps {
  dates: string[];
  startHour: number;
  endHour: number;
  availability: Record<string, string[]>;
  conflicts: Record<string, string[]>;
  onChange: (updates: Record<string, string[]>) => void;
}

type DragState =
  | { type: "create"; date: string; startTime: string; endTime: string }
  | {
      type: "resize";
      date: string;
      blockStart: string;
      blockEnd: string;
      edge: "top" | "bottom";
      anchorTime: string;
      currentTime: string;
    }
  | {
      type: "move";
      date: string;
      blockStart: string;
      blockEnd: string;
      origDate: string;
      origStart: string;
    };

function timeToSlotIndex(time: string, startHour: number): number {
  return (timeToMinutes(time) - startHour * 60) / 30;
}

function formatDayHeader(dateStr: string): { day: string; date: string } {
  const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: DAYS[d.getDay()],
    date: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
  };
}

function detectBlockDragAction(
  relY: number,
  blockHeight: number,
  block: { date: string; startTime: string; endTime: string },
): DragState {
  if (relY <= EDGE_HIT) {
    return {
      type: "resize",
      date: block.date,
      blockStart: block.startTime,
      blockEnd: block.endTime,
      edge: "top",
      anchorTime: block.endTime,
      currentTime: block.startTime,
    };
  }
  if (relY >= blockHeight - EDGE_HIT) {
    return {
      type: "resize",
      date: block.date,
      blockStart: block.startTime,
      blockEnd: block.endTime,
      edge: "bottom",
      anchorTime: block.startTime,
      currentTime: block.endTime,
    };
  }
  return {
    type: "move",
    date: block.date,
    blockStart: block.startTime,
    blockEnd: block.endTime,
    origDate: block.date,
    origStart: block.startTime,
  };
}

function blockPreviewHeight(startTime: string, endTime: string, startHour: number): number {
  const si = timeToSlotIndex(startTime, startHour);
  const ei = timeToSlotIndex(endTime, startHour);
  return (Math.max(si, ei) - Math.min(si, ei) + 1) * CELL_HEIGHT - BLOCK_PAD * 2;
}

function isBlockDragging(
  renderDrag: DragState | null,
  block: { date: string; startTime: string; endTime: string },
): boolean {
  if (!renderDrag || renderDrag.type === "create") return false;
  if (renderDrag.type === "move") {
    return (
      block.date === renderDrag.origDate &&
      block.startTime === renderDrag.origStart &&
      block.endTime === renderDrag.blockEnd
    );
  }
  return (
    block.date === renderDrag.date &&
    block.startTime === renderDrag.blockStart &&
    block.endTime === renderDrag.blockEnd
  );
}

export function TimeGrid({
  dates,
  startHour,
  endHour,
  availability,
  conflicts,
  onChange,
}: TimeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const committedRef = useRef(false);
  const dragMovedRef = useRef(false);
  const [renderDrag, setRenderDrag] = useState<DragState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    date: string; startTime: string; endTime: string;
  } | null>(null);

  const slots = generateSlots(startHour, endHour);
  const totalRows = slots.length;
  const gridHeight = totalRows * CELL_HEIGHT;
  const gridWidth = dates.length * COL_WIDTH;
  const blocks = getBlocks(availability, dates);
  const conflictBlocks = getBlocks(conflicts, dates);

  const resolveGridPos = useCallback(
    (clientX: number, clientY: number) => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [],
  );

  const commitCreate = useCallback(
    (date: string, startTime: string, endTime: string) => {
      if (committedRef.current) return;
      committedRef.current = true;
      const [from, to] = startTime <= endTime
        ? [startTime, endTime]
        : [endTime, startTime];
      const current = availability[date] ?? [];
      onChange({ [date]: selectRange(current, from, to) });
    },
    [availability, onChange],
  );

  const commitResize = useCallback(
    (date: string, blockStart: string, blockEnd: string, edge: "top" | "bottom", currentTime: string) => {
      if (committedRef.current) return;
      committedRef.current = true;
      const current = availability[date] ?? [];
      let updated = deselectRange(current, blockStart, subtract30Minutes(blockEnd));
      if (edge === "top") {
        const newStart = currentTime < blockEnd ? currentTime : subtract30Minutes(blockEnd);
        if (newStart < blockEnd) {
          updated = selectRange(updated, newStart, subtract30Minutes(blockEnd));
        }
      } else {
        const newEnd = currentTime > blockStart ? currentTime : add30Minutes(blockStart);
        if (newEnd > blockStart) {
          updated = selectRange(updated, blockStart, newEnd);
        }
      }
      onChange({ [date]: updated });
    },
    [availability, onChange],
  );

  const commitMove = useCallback(
    (origDate: string, blockStart: string, blockEnd: string, newDate: string, newStart: string) => {
      if (committedRef.current) return;
      committedRef.current = true;
      const duration = timeToSlotIndex(blockEnd, startHour) - timeToSlotIndex(blockStart, startHour);
      const updates: Record<string, string[]> = {};

      if (origDate === newDate) {
        // Same date: remove old, add at new position
        let slots = deselectRange(
          availability[origDate] ?? [],
          blockStart,
          subtract30Minutes(blockEnd),
        );
        let s = newStart;
        for (let i = 0; i < duration; i++) {
          slots = selectRange(slots, s, s);
          s = add30Minutes(s);
        }
        updates[origDate] = slots;
      } else {
        updates[origDate] = deselectRange(
          availability[origDate] ?? [],
          blockStart,
          subtract30Minutes(blockEnd),
        );
        let result = availability[newDate] ?? [];
        let s = newStart;
        for (let i = 0; i < duration; i++) {
          result = selectRange(result, s, s);
          s = add30Minutes(s);
        }
        updates[newDate] = result;
      }
      onChange(updates);
    },
    [availability, startHour, onChange],
  );

  const setDrag = useCallback((state: DragState | null) => {
    dragRef.current = state;
    setRenderDrag(state);
  }, []);

  const handleDelete = useCallback((date: string, startTime: string, endTime: string) => {
    const current = availability[date] ?? [];
    onChange({ [date]: deselectRange(current, startTime, subtract30Minutes(endTime)) });
    setDeleteTarget(null);
  }, [availability, onChange]);

  const finishDrag = useCallback(() => {
    const ds = dragRef.current;
    if (!ds || committedRef.current) {
      setDrag(null);
      return;
    }
    if (!dragMovedRef.current && ds.type !== "create") {
      if (ds.type === "move") {
        setDeleteTarget({ date: ds.origDate, startTime: ds.origStart, endTime: ds.blockEnd });
      } else {
        setDeleteTarget({ date: ds.date, startTime: ds.blockStart, endTime: ds.blockEnd });
      }
      setDrag(null);
      return;
    }
    if (ds.type === "create") {
      commitCreate(ds.date, ds.startTime, ds.endTime);
    } else if (ds.type === "resize") {
      commitResize(ds.date, ds.blockStart, ds.blockEnd, ds.edge, ds.currentTime);
    } else if (ds.type === "move") {
      commitMove(ds.origDate, ds.origStart, ds.blockEnd, ds.date, ds.blockStart);
    }
    setDrag(null);
  }, [commitCreate, commitResize, commitMove, setDrag]);

  const handleGridMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".tg-block")) return;
      setDeleteTarget(null);
      committedRef.current = false;
      dragMovedRef.current = false;
      const pos = resolveGridPos(e.clientX, e.clientY);
      if (!pos) return;
      const result = gridPixelToSlot(
        pos.x, pos.y, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour,
      );
      if (!result) return;
      setDrag({
        type: "create",
        date: result.date,
        startTime: result.time,
        endTime: add30Minutes(result.time),
      });
    },
    [resolveGridPos, dates, startHour, endHour, setDrag],
  );

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, b: { date: string; startTime: string; endTime: string }) => {
      e.stopPropagation();
      committedRef.current = false;
      dragMovedRef.current = false;
      const pos = resolveGridPos(e.clientX, e.clientY);
      if (!pos) return;

      const topIdx = timeToSlotIndex(b.startTime, startHour);
      const botIdx = timeToSlotIndex(b.endTime, startHour);
      const blockHeight = (botIdx - topIdx) * CELL_HEIGHT;
      const relY = pos.y - topIdx * CELL_HEIGHT;

      setDrag(detectBlockDragAction(relY, blockHeight, b));
    },
    [resolveGridPos, startHour, setDrag],
  );

  const handleGridMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;
      dragMovedRef.current = true;
      const pos = resolveGridPos(e.clientX, e.clientY);
      if (!pos) return;
      const result = gridPixelToSlot(
        pos.x, pos.y, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour,
      );

      if (ds.type === "create") {
        if (!result || result.date !== ds.date) return;
        dragRef.current = { ...ds, endTime: add30Minutes(result.time) };
        setRenderDrag({ ...dragRef.current });
      } else if (ds.type === "resize") {
        if (!result || result.date !== ds.date) return;
        dragRef.current = { ...ds, currentTime: result.time };
        setRenderDrag({ ...dragRef.current });
      } else if (ds.type === "move") {
        if (!result) return;
        dragRef.current = { ...ds, date: result.date, blockStart: result.time };
        setRenderDrag({ ...dragRef.current });
      }
    },
    [resolveGridPos, dates, startHour, endHour],
  );

  const handleGridMouseUp = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  const handleGridMouseLeave = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if ((e.target as HTMLElement).closest(".tg-block")) return;
      committedRef.current = false;
      const pos = resolveGridPos(touch.clientX, touch.clientY);
      if (!pos) return;
      const result = gridPixelToSlot(
        pos.x, pos.y, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour,
      );
      if (!result) return;
      setDrag({
        type: "create",
        date: result.date,
        startTime: result.time,
        endTime: add30Minutes(result.time),
      });
    },
    [resolveGridPos, dates, startHour, endHour, setDrag],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const ds = dragRef.current;
      if (!ds) return;
      dragMovedRef.current = true;
      const pos = resolveGridPos(touch.clientX, touch.clientY);
      if (!pos) return;
      const result = gridPixelToSlot(
        pos.x, pos.y, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour,
      );

      if (ds.type === "create") {
        if (!result || result.date !== ds.date) return;
        dragRef.current = { ...ds, endTime: add30Minutes(result.time) };
        setRenderDrag({ ...dragRef.current });
      } else if (ds.type === "resize") {
        if (!result || result.date !== ds.date) return;
        dragRef.current = { ...ds, currentTime: result.time };
        setRenderDrag({ ...dragRef.current });
      } else if (ds.type === "move") {
        if (!result) return;
        dragRef.current = { ...ds, date: result.date, blockStart: result.time };
        setRenderDrag({ ...dragRef.current });
      }
    },
    [resolveGridPos, dates, startHour, endHour],
  );

  const handleTouchEnd = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  const handleBlockTouchStart = useCallback(
    (e: React.TouchEvent, b: { date: string; startTime: string; endTime: string }) => {
      e.stopPropagation();
      const touch = e.touches[0];
      if (!touch) return;
      committedRef.current = false;
      dragMovedRef.current = false;
      const pos = resolveGridPos(touch.clientX, touch.clientY);
      if (!pos) return;

      const topIdx = timeToSlotIndex(b.startTime, startHour);
      const botIdx = timeToSlotIndex(b.endTime, startHour);
      const blockHeight = (botIdx - topIdx) * CELL_HEIGHT;
      const relY = pos.y - topIdx * CELL_HEIGHT;

      setDrag(detectBlockDragAction(relY, blockHeight, b));
    },
    [resolveGridPos, startHour, setDrag],
  );

  const filledDays = dates.filter((d) => {
    const s = availability[d];
    return s && s.length > 0;
  }).length;
  const showHint = filledDays >= 4 && filledDays < dates.length;

  return (
    <div className="tg-wrap">
      <div className="tg-scroll">
        <div className="tg-outer">
          <div className="tg-labels" style={{ width: TIME_LABEL_WIDTH }}>
            <div className="tg-labels-spacer" />
            {slots.map((time) => (
              <div key={time} className="tg-label" style={{ height: CELL_HEIGHT }}>
                {time}
              </div>
            ))}
          </div>

          <div className="tg-grid" style={{ width: gridWidth }}>
            <div className="tg-headers" style={{ height: CELL_HEIGHT }}>
              {dates.map((date) => {
                const h = formatDayHeader(date);
                return (
                  <div key={date} className="tg-header" style={{ width: COL_WIDTH }}>
                    <span className="tg-header-day">{h.day}</span>
                    <span className="tg-header-date">{h.date}</span>
                  </div>
                );
              })}
            </div>

            <div
              ref={gridRef}
              className="tg-area"
              style={{ height: gridHeight, width: gridWidth }}
              onMouseDown={handleGridMouseDown}
              onMouseMove={handleGridMouseMove}
              onMouseUp={handleGridMouseUp}
              onMouseLeave={handleGridMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {dates.map((date, colIdx) => (
                <div
                  key={date}
                  className="tg-col"
                  style={{
                    left: colIdx * COL_WIDTH,
                    width: COL_WIDTH,
                    height: gridHeight,
                  }}
                >
                  {slots.map((time, rowIdx) => (
                    <div
                      key={time}
                      className={`tg-line ${time.endsWith(":00") ? "tg-line-hour" : "tg-line-half"}`}
                      style={{ top: rowIdx * CELL_HEIGHT }}
                    />
                  ))}
                </div>
              ))}

              {conflictBlocks.map((b, i) => {
                const colIdx = dates.indexOf(b.date);
                const topIdx = timeToSlotIndex(b.startTime, startHour);
                const botIdx = timeToSlotIndex(b.endTime, startHour);
                return (
                  <div
                    key={`conflict-${i}`}
                    className="tg-conflict"
                    style={{
                      left: colIdx * COL_WIDTH + BLOCK_PAD,
                      top: topIdx * CELL_HEIGHT + BLOCK_PAD,
                      width: COL_WIDTH - BLOCK_PAD * 2,
                      height: (botIdx - topIdx) * CELL_HEIGHT - BLOCK_PAD * 2,
                    }}
                  />
                );
              })}

              {blocks.map((b, i) => {
                const colIdx = dates.indexOf(b.date);
                const topIdx = timeToSlotIndex(b.startTime, startHour);
                const botIdx = timeToSlotIndex(b.endTime, startHour);
                const dateConflicts = conflicts[b.date] ?? [];
                const blockSlots = slotsInTimeRange(
                  b.startTime,
                  b.endTime,
                  startHour,
                  endHour,
                );
                const hasConflict = blockSlots.some((s) => dateConflicts.includes(s));
                const dragging = isBlockDragging(renderDrag, b);
                return (
                  <div
                    key={`block-${i}`}
                    className={`tg-block${hasConflict ? " has-conflict" : ""}${dragging ? " tg-block-dragging" : ""}`}
                    style={{
                      left: colIdx * COL_WIDTH + BLOCK_PAD,
                      top: topIdx * CELL_HEIGHT + BLOCK_PAD,
                      width: COL_WIDTH - BLOCK_PAD * 2,
                      height: (botIdx - topIdx) * CELL_HEIGHT - BLOCK_PAD * 2,
                    }}
                    onMouseDown={(e) => handleBlockMouseDown(e, b)}
                    onTouchStart={(e) => handleBlockTouchStart(e, b)}
                  >
                    <div className="tg-block-handle tg-block-handle-top" />
                    <div className="tg-block-body" />
                    <div className="tg-block-handle tg-block-handle-bot" />
                  </div>
                );
              })}

              {/* Create preview */}
              {renderDrag && renderDrag.type === "create" && (
                <div
                  className="tg-block tg-block-preview"
                  style={{
                    left: dates.indexOf(renderDrag.date) * COL_WIDTH + BLOCK_PAD,
                    top:
                      timeToSlotIndex(renderDrag.startTime, startHour) * CELL_HEIGHT +
                      BLOCK_PAD,
                    width: COL_WIDTH - BLOCK_PAD * 2,
                    height: blockPreviewHeight(renderDrag.startTime, renderDrag.endTime, startHour),
                  }}
                />
              )}

              {/* Resize preview */}
              {renderDrag && renderDrag.type === "resize" && (
                <div
                  className="tg-block tg-block-preview"
                  style={{
                    left: dates.indexOf(renderDrag.date) * COL_WIDTH + BLOCK_PAD,
                    width: COL_WIDTH - BLOCK_PAD * 2,
                    ...(renderDrag.edge === "top"
                      ? {
                          top:
                            timeToSlotIndex(renderDrag.currentTime, startHour) *
                              CELL_HEIGHT +
                            BLOCK_PAD,
                          height:
                            (timeToSlotIndex(renderDrag.anchorTime, startHour) -
                              timeToSlotIndex(renderDrag.currentTime, startHour)) *
                              CELL_HEIGHT -
                            BLOCK_PAD * 2,
                        }
                      : {
                          top:
                            timeToSlotIndex(renderDrag.anchorTime, startHour) *
                              CELL_HEIGHT +
                            BLOCK_PAD,
                          height:
                            (timeToSlotIndex(renderDrag.currentTime, startHour) -
                              timeToSlotIndex(renderDrag.anchorTime, startHour) +
                              1) *
                              CELL_HEIGHT -
                            BLOCK_PAD * 2,
                        }),
                  }}
                />
              )}

              {/* Move preview */}
              {renderDrag && renderDrag.type === "move" && (
                <div
                  className="tg-block tg-block-preview"
                  style={{
                    left: dates.indexOf(renderDrag.date) * COL_WIDTH + BLOCK_PAD,
                    top:
                      timeToSlotIndex(renderDrag.blockStart, startHour) * CELL_HEIGHT +
                      BLOCK_PAD,
                    width: COL_WIDTH - BLOCK_PAD * 2,
                    height:
                      (timeToSlotIndex(renderDrag.blockEnd, startHour) -
                        timeToSlotIndex(renderDrag.origStart, startHour)) *
                        CELL_HEIGHT -
                      BLOCK_PAD * 2,
                  }}
                />
              )}
            </div>
          </div>

          {showHint && (
            <div className="tg-hint">
              Ada {dates.length - filledDays} hari lagi &rarr;
            </div>
          )}
        </div>
      </div>
      <div className="tg-hint-static">
        Tap untuk buat/hapus blok &middot; Geser ujung untuk atur durasi &middot; Drag tengah untuk pindahkan
      </div>

      {deleteTarget && (
        <div className="tg-popover-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="tg-popover" onClick={(e) => e.stopPropagation()}>
            <p className="tg-popover-text">Hapus blok waktu ini?</p>
            <div className="tg-popover-actions">
              <button className="tg-popover-btn tg-popover-btn-hapus" onClick={() => handleDelete(deleteTarget.date, deleteTarget.startTime, deleteTarget.endTime)}>Hapus</button>
              <button className="tg-popover-btn tg-popover-btn-batal" onClick={() => setDeleteTarget(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
