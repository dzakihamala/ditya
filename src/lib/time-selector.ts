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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

export function getConflictingSlots(
  events: GCalEvent[],
  date: string,
  startHour: number,
  endHour: number,
): string[] {
  const allSlots = new Set(generateSlots(startHour, endHour));
  const conflicts = new Set<string>();

  for (const event of events) {
    let eventStart = new Date(event.start);
    let eventEnd = new Date(event.end);

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
