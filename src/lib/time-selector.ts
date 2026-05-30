const MINS_PER_SLOT = 30;

export function generateSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  let minutes = startHour * 60;
  const endMinutes = endHour * 60;
  while (minutes < endMinutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    minutes += MINS_PER_SLOT;
  }
  return slots;
}

export function add30Minutes(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + MINS_PER_SLOT;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function subtract30Minutes(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m - MINS_PER_SLOT;
  const nh = ((Math.floor(total / 60) % 24) + 24) % 24;
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function gridPixelToSlot(
  x: number,
  y: number,
  colWidth: number,
  cellHeight: number,
  dates: string[],
  startHour: number,
  endHour: number,
): { date: string; time: string } | null {
  const colIndex = Math.floor(x / colWidth);
  if (colIndex < 0 || colIndex >= dates.length || dates.length === 0) return null;
  const totalSlots = (endHour - startHour) * (60 / MINS_PER_SLOT);
  const slotIndex = Math.floor(y / cellHeight);
  if (slotIndex < 0 || slotIndex >= totalSlots) return null;
  const minutes = startHour * 60 + slotIndex * MINS_PER_SLOT;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    date: dates[colIndex],
    time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

export function slotIndexToTime(slotIndex: number, startHour: number): string {
  const minutes = startHour * 60 + slotIndex * MINS_PER_SLOT;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimeBlock {
  date: string;
  startTime: string;
  endTime: string;
}

export function getBlocks(availability: Record<string, string[]>, dates: string[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  for (const date of dates) {
    const slots = availability[date];
    if (!slots || slots.length === 0) continue;
    for (const r of slotsToRanges(slots)) {
      blocks.push({ date, startTime: r.start, endTime: r.end });
    }
  }
  return blocks;
}

export function timeToPixel(
  time: string,
  startHour: number,
  endHour: number,
  barWidth: number,
): number {
  const totalSlots = (endHour - startHour) * (60 / MINS_PER_SLOT);
  if (totalSlots <= 0) return 0;
  const slotIndex = (timeToMinutes(time) - startHour * 60) / MINS_PER_SLOT;
  const slotWidth = barWidth / totalSlots;
  return slotIndex * slotWidth;
}

export function pixelToTime(
  pixel: number,
  startHour: number,
  endHour: number,
  barWidth: number,
): string {
  const totalSlots = (endHour - startHour) * (60 / MINS_PER_SLOT);
  if (totalSlots <= 0) return floatToTimeStr(startHour);
  const slotWidth = barWidth / totalSlots;
  const slotIndex = Math.max(0, Math.min(Math.floor(pixel / slotWidth), totalSlots - 1));
  const minutes = startHour * 60 + slotIndex * MINS_PER_SLOT;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function floatToTimeStr(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toggleSlot(slots: string[], time: string): string[] {
  const idx = slots.indexOf(time);
  if (idx >= 0) {
    return slots.filter((s) => s !== time);
  }
  return [...slots, time].sort();
}

export function selectRange(slots: string[], rangeStart: string, rangeEnd: string): string[] {
  const startMin = timeToMinutes(rangeStart);
  const endMin = timeToMinutes(rangeEnd);
  const [from, to] = startMin <= endMin ? [startMin, endMin] : [endMin, startMin];
  const rangeSet = new Set(slots);
  for (let m = from; m <= to; m += MINS_PER_SLOT) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    rangeSet.add(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return Array.from(rangeSet).sort();
}

export function deselectRange(slots: string[], rangeStart: string, rangeEnd: string): string[] {
  const startMin = timeToMinutes(rangeStart);
  const endMin = timeToMinutes(rangeEnd);
  const [from, to] = startMin <= endMin ? [startMin, endMin] : [endMin, startMin];
  const removeSet = new Set<string>();
  for (let m = from; m <= to; m += MINS_PER_SLOT) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    removeSet.add(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return slots.filter((s) => !removeSet.has(s));
}

export function isSlotSelected(slots: string[], time: string): boolean {
  return slots.includes(time);
}

export function slotsToRanges(slots: string[]): { start: string; end: string }[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort();
  const ranges: { start: string; end: string }[] = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i < sorted.length; i++) {
    const expected = add30Minutes(prev);
    if (sorted[i] !== expected) {
      ranges.push({ start, end: add30Minutes(prev) });
      start = sorted[i];
    }
    prev = sorted[i];
  }
  ranges.push({ start, end: add30Minutes(prev) });
  return ranges;
}

export type DateChipStatus = "filled" | "skipped" | "active" | "pending";

export function getDateChipStatus(
  date: string,
  availability: Record<string, string[]>,
  activeDate: string,
): DateChipStatus {
  if (date === activeDate) return "active";
  const slots = availability[date];
  if (!slots) return "pending";
  if (slots.length === 0) return "skipped";
  return "filled";
}

export interface GCalEvent {
  start: string;
  end: string;
  summary?: string;
}

export function parseGCalInstant(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(iso + "T00:00:00");
  }
  return new Date(iso);
}

/** Slots with start times in [startTime, endTime) within the meeting day window. */
export function slotsInTimeRange(
  startTime: string,
  endTime: string,
  startHour: number,
  endHour: number,
): string[] {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  return generateSlots(startHour, endHour).filter((slot) => {
    const m = timeToMinutes(slot);
    return m >= startMin && m < endMin;
  });
}

export interface ConflictBlock extends TimeBlock {
  summary?: string;
}

/** Build conflict blocks from GCal events, clipped to meeting hours per date. */
export function buildConflictBlocks(
  events: GCalEvent[],
  dates: string[],
  startHour: number,
  endHour: number,
): ConflictBlock[] {
  const blocks: ConflictBlock[] = [];
  const meetingStartMin = startHour * 60;
  const meetingEndMin = endHour * 60;

  for (const date of dates) {
    const dateStart = new Date(date + "T00:00:00");
    const dateEnd = new Date(date + "T23:59:59");

    for (const event of events) {
      const eventStart = parseGCalInstant(event.start);
      const eventEnd = parseGCalInstant(event.end);
      if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) continue;
      if (eventEnd <= dateStart || eventStart >= dateEnd) continue;

      const overlapStart = Math.max(eventStart.getTime(), dateStart.getTime());
      const overlapEnd = Math.min(eventEnd.getTime(), dateEnd.getTime());
      const startDate = new Date(overlapStart);
      const endDate = new Date(overlapEnd);
      const startMin = startDate.getHours() * 60 + startDate.getMinutes();
      const endMin = endDate.getHours() * 60 + endDate.getMinutes();

      const clippedStart = Math.max(startMin, meetingStartMin);
      const clippedEnd = Math.min(endMin, meetingEndMin);
      if (clippedStart >= clippedEnd) continue;

      const sh = Math.floor(clippedStart / 60);
      const sm = clippedStart % 60;
      const eh = Math.floor(clippedEnd / 60);
      const em = clippedEnd % 60;

      blocks.push({
        date,
        startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
        endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
        summary: event.summary,
      });
    }
  }

  return blocks;
}

export function getConflictsByDate(
  events: GCalEvent[],
  dates: string[],
  startHour: number,
  endHour: number,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const date of dates) {
    const slots = getConflictingSlots(events, date, startHour, endHour);
    if (slots.length > 0) result[date] = slots;
  }
  return result;
}

export function getConflictingSlots(
  events: GCalEvent[],
  date: string,
  startHour: number,
  endHour: number,
): string[] {
  const allSlots = new Set(generateSlots(startHour, endHour));
  const conflicts = new Set<string>();

  for (const event of events) {
    let eventStart = parseGCalInstant(event.start);
    let eventEnd = parseGCalInstant(event.end);

    if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) continue;

    const dateStart = new Date(date + "T00:00:00");
    const dateEnd = new Date(date + "T23:59:59");

    if (eventEnd <= dateStart || eventStart >= dateEnd) continue;

    const overlapStart = new Date(
      Math.max(eventStart.getTime(), dateStart.getTime()),
    );
    const overlapEnd = new Date(
      Math.min(eventEnd.getTime(), dateEnd.getTime()),
    );

    const overlapStartMin = overlapStart.getHours() * 60 + overlapStart.getMinutes();
    const overlapEndMin = overlapEnd.getHours() * 60 + overlapEnd.getMinutes();

    for (const slot of allSlots) {
      const slotMin = timeToMinutes(slot);
      if (slotMin >= overlapStartMin && slotMin < overlapEndMin) {
        conflicts.add(slot);
      }
    }
  }

  return Array.from(conflicts).sort();
}
