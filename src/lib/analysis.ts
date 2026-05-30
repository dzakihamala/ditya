import { generateSlots, add30Minutes } from "./time-selector";
import { formatDateLong } from "./date-utils";

export interface ParticipantData {
  id: string;
  name: string;
  displayName?: string;
  availability: Record<string, string[]>;
}

export interface SlotCount {
  slot: string;
  count: number;
  participantNames: string[];
}

export interface HeatmapCell {
  date: string;
  slot: string;
  count: number;
  intensity: number;
  participantNames: string[];
}

export interface ContiguousBlock {
  date: string;
  start: string;
  end: string;
  participantCount: number;
  totalParticipants: number;
  durationMinutes: number;
  participantNames: string[];
  missingNames: string[];
}

export interface AnalysisMetrics {
  totalParticipants: number;
  filledSlots: number;
  activeDays: number;
}

export type ParticipantStatus = "bisa" | "tidak_bisa" | "belum_isi";

export interface ParticipantSummary {
  id: string;
  displayName: string;
  totalSlots: number;
  status: ParticipantStatus;
}

export function computeMetrics(
  participants: ParticipantData[],
  dates: string[],
): AnalysisMetrics {
  const totalParticipants = participants.length;
  let filledSlots = 0;
  const activeDates = new Set<string>();

  for (const p of participants) {
    for (const date of dates) {
      const slots = p.availability[date];
      if (slots && slots.length > 0) {
        filledSlots += slots.length;
        activeDates.add(date);
      }
    }
  }

  return { totalParticipants, filledSlots, activeDays: activeDates.size };
}

export function computeSlotCounts(
  participants: ParticipantData[],
  date: string,
  slots: string[],
): SlotCount[] {
  const nameMap = new Map<string, string[]>();
  for (const slot of slots) nameMap.set(slot, []);

  for (const p of participants) {
    const avail = p.availability[date];
    if (avail) {
      for (const slot of avail) {
        const names = nameMap.get(slot);
        if (names) names.push(p.displayName || p.name);
      }
    }
  }

  return slots.map((slot) => ({
    slot,
    count: nameMap.get(slot)!.length,
    participantNames: nameMap.get(slot)!,
  }));
}

export function computeHeatmap(
  participants: ParticipantData[],
  dates: string[],
  slots: string[],
): HeatmapCell[][] {
  const total = participants.length;

  return slots.map((slot) =>
    dates.map((date) => {
      const names: string[] = [];
      for (const p of participants) {
        const avail = p.availability[date];
        if (avail && avail.includes(slot)) {
          names.push(p.displayName || p.name);
        }
      }
      return {
        date,
        slot,
        count: names.length,
        intensity: total > 0 ? names.length / total : 0,
        participantNames: names,
      };
    }),
  );
}

export function findContiguousBlocks(
  participants: ParticipantData[],
  date: string,
  slots: string[],
): ContiguousBlock[] {
  const slotCounts = computeSlotCounts(participants, date, slots);
  const total = participants.length;
  const blocks: ContiguousBlock[] = [];

  let i = 0;
  while (i < slotCounts.length) {
    if (slotCounts[i].count === 0) {
      i++;
      continue;
    }

    let j = i;
    while (j < slotCounts.length && slotCounts[j].count === slotCounts[i].count) {
      j++;
    }

    const blockSlots = slotCounts.slice(i, j);
    const allNames = new Set<string>();
    for (const sc of blockSlots) {
      for (const name of sc.participantNames) allNames.add(name);
    }

    const missing: string[] = [];
    for (const p of participants) {
      const dn = p.displayName || p.name;
      if (!allNames.has(dn)) missing.push(dn);
    }

    blocks.push({
      date,
      start: blockSlots[0].slot,
      end: add30Minutes(blockSlots[blockSlots.length - 1].slot),
      participantCount: slotCounts[i].count,
      totalParticipants: total,
      durationMinutes: blockSlots.length * 30,
      participantNames: [...allNames],
      missingNames: missing,
    });

    i = j;
  }

  return blocks;
}

export function findAllBlocks(
  participants: ParticipantData[],
  dates: string[],
  startHour: number,
  endHour: number,
): ContiguousBlock[] {
  const slots = generateSlots(startHour, endHour);
  return dates.flatMap((date) => findContiguousBlocks(participants, date, slots));
}

export function rankRecommendations(
  blocks: ContiguousBlock[],
  topN = 3,
): ContiguousBlock[] {
  return blocks
    .filter((b) => b.participantCount > 0)
    .sort((a, b) => {
      if (b.participantCount !== a.participantCount) {
        return b.participantCount - a.participantCount;
      }
      return b.durationMinutes - a.durationMinutes;
    })
    .slice(0, topN);
}

export function classifyParticipants(
  participants: ParticipantData[],
  dates: string[],
): ParticipantSummary[] {
  return participants.map((p) => {
    let totalSlots = 0;
    let hasAvailability = false;
    let hasSkip = false;

    for (const date of dates) {
      const s = p.availability[date];
      if (s && s.length > 0) {
        hasAvailability = true;
        totalSlots += s.length;
      } else if (s && s.length === 0) {
        hasSkip = true;
      }
    }

    const status: ParticipantStatus = hasAvailability
      ? "bisa"
      : hasSkip
        ? "tidak_bisa"
        : "belum_isi";

    return {
      id: p.id,
      displayName: p.displayName || p.name,
      totalSlots,
      status,
    };
  });
}

export function formatCopySummary(
  recommendations: ContiguousBlock[],
  meetingName: string,
  participantCount: number,
  meetingLink: string,
): string {
  let text = `*${meetingName}*\n\n`;
  text += `Total peserta: ${participantCount}\n\n`;

  if (recommendations.length > 0) {
    text += `*Top ${recommendations.length} Rekomendasi Jadwal*\n\n`;
    for (let i = 0; i < recommendations.length; i++) {
      const r = recommendations[i];
      const dateLabel = formatDateLong(r.date);
      text += `${i + 1}. ${dateLabel}, ${r.start}–${r.end} (${r.participantCount}/${r.totalParticipants} peserta)\n`;
    }
  }

  text += `\nLink: ${meetingLink}`;
  return text;
}
