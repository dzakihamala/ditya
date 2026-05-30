export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const days = getDaysInMonth(year, month);
  const grid: (string | null)[][] = [];
  let week: (string | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    week.push(null);
  }

  for (let day = 1; day <= days; day++) {
    week.push(formatDate(year, month, day));
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    grid.push(week);
  }

  return grid;
}

export function toggleDate(dates: string[], date: string): string[] {
  const idx = dates.indexOf(date);
  if (idx >= 0) {
    return dates.filter((d) => d !== date);
  }
  return [...dates, date].sort();
}

export function selectDateRange(dates: string[], start: string, end: string): string[] {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  const rangeSet = new Set(dates);
  const cur = new Date(from);
  while (cur <= to) {
    rangeSet.add(formatDate(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }

  return Array.from(rangeSet).sort();
}

export function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function parseDate(str: string): { year: number; month: number; day: number } {
  const [y, m, d] = str.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function floatToTimeStr(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeStrToFloat(str: string): number {
  const [h, m] = str.split(":").map(Number);
  return h + m / 60;
}

export function formatDateShort(isoStr: string): string {
  const d = new Date(isoStr + "T00:00:00");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
