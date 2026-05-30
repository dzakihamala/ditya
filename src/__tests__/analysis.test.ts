import { describe, it, expect } from "vitest";
import {
  computeMetrics,
  computeSlotCounts,
  computeHeatmap,
  findContiguousBlocks,
  findAllBlocks,
  rankRecommendations,
  classifyParticipants,
  formatCopySummary,
} from "@/lib/analysis";
import type { ParticipantData } from "@/lib/analysis";

function makeParticipant(
  id: string,
  name: string,
  displayName: string,
  availability: Record<string, string[]>,
): ParticipantData {
  return { id, name, displayName, availability };
}

const DATES = ["2026-06-15", "2026-06-16", "2026-06-17"];
const SLOTS_8_10 = ["08:00", "08:30", "09:00", "09:30"];

/* ------------------------------------------------------------------ */
/*  computeMetrics                                                     */
/* ------------------------------------------------------------------ */

describe("computeMetrics", () => {
  it("returns zeros for empty participants", () => {
    const m = computeMetrics([], DATES);
    expect(m.totalParticipants).toBe(0);
    expect(m.filledSlots).toBe(0);
    expect(m.activeDays).toBe(0);
  });

  it("counts total participants, filled slots, and active days", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00", "08:30"],
        "2026-06-16": ["09:00"],
      }),
      makeParticipant("p2", "BOB", "Bob", {
        "2026-06-15": ["08:00"],
        "2026-06-17": [],
      }),
    ];
    const m = computeMetrics(participants, DATES);
    expect(m.totalParticipants).toBe(2);
    expect(m.filledSlots).toBe(4);
    expect(m.activeDays).toBe(2); // only 06-15 and 06-16 have slots
  });

  it("ignores dates with no participants", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {}),
    ];
    const m = computeMetrics(participants, DATES);
    expect(m.totalParticipants).toBe(1);
    expect(m.filledSlots).toBe(0);
    expect(m.activeDays).toBe(0);
  });

  it("counts empty arrays as skipped, not filled", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": [],
        "2026-06-16": ["08:00"],
      }),
    ];
    const m = computeMetrics(participants, DATES);
    expect(m.filledSlots).toBe(1);
    expect(m.activeDays).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  computeSlotCounts                                                  */
/* ------------------------------------------------------------------ */

describe("computeSlotCounts", () => {
  it("returns zero counts when no participants have slots", () => {
    const counts = computeSlotCounts([], "2026-06-15", SLOTS_8_10);
    expect(counts).toHaveLength(SLOTS_8_10.length);
    for (const c of counts) expect(c.count).toBe(0);
  });

  it("counts participants per slot", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00", "08:30"],
      }),
      makeParticipant("p2", "BOB", "Bob", {
        "2026-06-15": ["08:00", "09:30"],
      }),
    ];
    const counts = computeSlotCounts(participants, "2026-06-15", SLOTS_8_10);
    expect(counts[0]).toEqual({ slot: "08:00", count: 2, participantNames: ["Alice", "Bob"] });
    expect(counts[1]).toEqual({ slot: "08:30", count: 1, participantNames: ["Alice"] });
    expect(counts[2]).toEqual({ slot: "09:00", count: 0, participantNames: [] });
    expect(counts[3]).toEqual({ slot: "09:30", count: 1, participantNames: ["Bob"] });
  });

  it("falls back to name when displayName is missing", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "", {
        "2026-06-15": ["08:00"],
      }),
    ];
    const counts = computeSlotCounts(participants, "2026-06-15", SLOTS_8_10);
    expect(counts[0].participantNames).toEqual(["ALICE"]);
  });

  it("ignores slots from other dates", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-16": ["08:00"],
      }),
    ];
    const counts = computeSlotCounts(participants, "2026-06-15", SLOTS_8_10);
    for (const c of counts) expect(c.count).toBe(0);
  });

  it("ignores unavailable slots that are not in the slots param", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["10:00"], // outside SLOTS_8_10
      }),
    ];
    const counts = computeSlotCounts(participants, "2026-06-15", SLOTS_8_10);
    for (const c of counts) expect(c.count).toBe(0);
  });

  it("preserves slot order from the slots param", () => {
    const reversedSlots = [...SLOTS_8_10].reverse();
    const counts = computeSlotCounts([], "2026-06-15", reversedSlots);
    expect(counts.map((c) => c.slot)).toEqual(reversedSlots);
  });
});

/* ------------------------------------------------------------------ */
/*  computeHeatmap                                                     */
/* ------------------------------------------------------------------ */

describe("computeHeatmap", () => {
  const dates = ["2026-06-15", "2026-06-16"];
  const slots = ["08:00", "08:30"];

  it("builds slots×dates grid", () => {
    const h = computeHeatmap([], dates, slots);
    expect(h).toHaveLength(2); // 2 slots
    expect(h[0]).toHaveLength(2); // 2 dates
    expect(h[1]).toHaveLength(2);
  });

  it("computes intensity as count/total", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00"],
      }),
      makeParticipant("p2", "BOB", "Bob", {
        "2026-06-15": ["08:00", "08:30"],
      }),
    ];
    const h = computeHeatmap(participants, dates, slots);
    // Slot 08:00, Date 2026-06-15: both available → count=2, intensity=1
    expect(h[0][0]).toMatchObject({ count: 2, intensity: 1 });
    // Slot 08:30, Date 2026-06-15: only Bob → count=1, intensity=0.5
    expect(h[1][0]).toMatchObject({ count: 1, intensity: 0.5 });
    // Slot 08:00, Date 2026-06-16: nobody
    expect(h[0][1]).toMatchObject({ count: 0, intensity: 0 });
  });

  it("returns zero intensity when no participants", () => {
    const h = computeHeatmap([], dates, slots);
    for (const row of h) {
      for (const cell of row) {
        expect(cell.intensity).toBe(0);
        expect(cell.count).toBe(0);
      }
    }
  });

  it("includes participant names in each cell", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00"],
      }),
    ];
    const h = computeHeatmap(participants, dates, slots);
    expect(h[0][0].participantNames).toEqual(["Alice"]);
    expect(h[0][1].participantNames).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  findContiguousBlocks                                               */
/* ------------------------------------------------------------------ */

describe("findContiguousBlocks", () => {
  it("returns empty when no participants", () => {
    const blocks = findContiguousBlocks([], "2026-06-15", SLOTS_8_10);
    expect(blocks).toEqual([]);
  });

  it("returns empty when no slots are selected", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": [],
      }),
    ];
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks).toEqual([]);
  });

  it("creates a single block for uniform availability", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00", "08:30", "09:00"],
      }),
    ];
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe("08:00");
    expect(blocks[0].end).toBe("09:30"); // end is exclusive (add30 of last slot)
    expect(blocks[0].participantCount).toBe(1);
    expect(blocks[0].durationMinutes).toBe(90);
  });

  it("splits blocks where counts differ", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00", "08:30"],
      }),
      makeParticipant("p2", "BOB", "Bob", {
        "2026-06-15": ["08:00"],
      }),
    ];
    // Slot counts: 08:00=2, 08:30=1, 09:00=0, 09:30=0
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].start).toBe("08:00");
    expect(blocks[0].end).toBe("08:30");
    expect(blocks[0].participantCount).toBe(2);
    expect(blocks[1].start).toBe("08:30");
    expect(blocks[1].end).toBe("09:00");
    expect(blocks[1].participantCount).toBe(1);
  });

  it("handles non-contiguous same-count blocks", () => {
    // Alice: 08:00, 09:00 (gapped)
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00", "09:00"],
      }),
    ];
    // Slot counts: 08:00=1, 08:30=0, 09:00=1, 09:30=0
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].start).toBe("08:00");
    expect(blocks[0].end).toBe("08:30");
    expect(blocks[1].start).toBe("09:00");
    expect(blocks[1].end).toBe("09:30");
  });

  it("names missing participants", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00"],
      }),
      makeParticipant("p2", "BOB", "Bob", {
        "2026-06-15": [],
      }),
    ];
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks[0].participantNames).toEqual(["Alice"]);
    expect(blocks[0].missingNames).toEqual(["Bob"]);
  });

  it("skips zero-count slots at start of range", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["09:30"], // last slot only
      }),
    ];
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe("09:30");
    expect(blocks[0].end).toBe("10:00");
  });

  it("uses all participants as names across the block", () => {
    const participants = [
      makeParticipant("p1", "ALICE", "Alice", {
        "2026-06-15": ["08:00"],
      }),
      makeParticipant("p2", "BOB", "Bob", {
        "2026-06-15": ["08:30"],
      }),
    ];
    // Slot counts: 08:00=1, 08:30=1, 09:00=0, 09:30=0
    const blocks = findContiguousBlocks(participants, "2026-06-15", SLOTS_8_10);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe("08:00");
    expect(blocks[0].end).toBe("09:00");
    expect(blocks[0].participantCount).toBe(1);
    expect(blocks[0].participantNames).toEqual(["Alice", "Bob"]);
  });
});

/* ------------------------------------------------------------------ */
/*  findAllBlocks                                                      */
/* ------------------------------------------------------------------ */

describe("findAllBlocks", () => {
  const participants = [
    makeParticipant("p1", "ALICE", "Alice", {
      "2026-06-15": ["08:00", "08:30"],
      "2026-06-16": ["09:00"],
    }),
    makeParticipant("p2", "BOB", "Bob", {
      "2026-06-15": ["08:00"],
    }),
  ];

  it("collects blocks across all dates", () => {
    const blocks = findAllBlocks(participants, ["2026-06-15", "2026-06-16"], 8, 10);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    const dates = [...new Set(blocks.map((b) => b.date))];
    expect(dates).toContain("2026-06-15");
    expect(dates).toContain("2026-06-16");
  });
});

/* ------------------------------------------------------------------ */
/*  rankRecommendations                                                */
/* ------------------------------------------------------------------ */

describe("rankRecommendations", () => {
  function makeBlock(
    date: string,
    start: string,
    end: string,
    count: number,
    total: number,
    duration: number,
  ) {
    return {
      date,
      start,
      end,
      participantCount: count,
      totalParticipants: total,
      durationMinutes: duration,
      participantNames: [],
      missingNames: [],
    };
  }

  it("returns empty for empty input", () => {
    expect(rankRecommendations([])).toEqual([]);
  });

  it("returns single block", () => {
    const block = makeBlock("2026-06-15", "08:00", "09:00", 5, 10, 60);
    expect(rankRecommendations([block])).toEqual([block]);
  });

  it("ranks by participant count first, then duration", () => {
    const a = makeBlock("2026-06-15", "08:00", "09:00", 5, 10, 60);
    const b = makeBlock("2026-06-16", "09:00", "10:30", 7, 10, 90);
    const c = makeBlock("2026-06-15", "10:00", "12:00", 7, 10, 120);
    // b and c have same count (7) but c has longer duration (120 > 90)
    const ranked = rankRecommendations([a, b, c]);
    expect(ranked[0]).toBe(c); // 7/10, 120min
    expect(ranked[1]).toBe(b); // 7/10, 90min
    expect(ranked[2]).toBe(a); // 5/10, 60min
  });

  it("filters out zero-count blocks", () => {
    const good = makeBlock("2026-06-15", "08:00", "09:00", 3, 10, 60);
    const zero = makeBlock("2026-06-16", "08:00", "09:00", 0, 10, 60);
    expect(rankRecommendations([zero, good])).toEqual([good]);
  });

  it("truncates to topN", () => {
    const blocks = [
      makeBlock("d1", "08:00", "09:00", 8, 10, 60),
      makeBlock("d2", "08:00", "09:00", 7, 10, 60),
      makeBlock("d3", "08:00", "09:00", 6, 10, 60),
      makeBlock("d4", "08:00", "09:00", 5, 10, 60),
    ];
    expect(rankRecommendations(blocks, 2)).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/*  classifyParticipants                                               */
/* ------------------------------------------------------------------ */

describe("classifyParticipants", () => {
  const dates = ["2026-06-15", "2026-06-16"];

  it('returns "bisa" when has slots', () => {
    const p = [makeParticipant("p1", "ALICE", "Alice", { "2026-06-15": ["08:00"] })];
    expect(classifyParticipants(p, dates)[0].status).toBe("bisa");
  });

  it('returns "tidak_bisa" when explicitly set to empty arrays', () => {
    const p = [makeParticipant("p1", "ALICE", "Alice", {
      "2026-06-15": [],
      "2026-06-16": [],
    })];
    expect(classifyParticipants(p, dates)[0].status).toBe("tidak_bisa");
  });

  it('returns "belum_isi" when no date keys exist', () => {
    const p = [makeParticipant("p1", "ALICE", "Alice", {})];
    expect(classifyParticipants(p, dates)[0].status).toBe("belum_isi");
  });

  it('prefers "bisa" over "tidak_bisa" when mixed', () => {
    const p = [makeParticipant("p1", "ALICE", "Alice", {
      "2026-06-15": [],
      "2026-06-16": ["08:00"],
    })];
    expect(classifyParticipants(p, dates)[0].status).toBe("bisa");
  });

  it("computes total slots across all dates", () => {
    const p = [makeParticipant("p1", "ALICE", "Alice", {
      "2026-06-15": ["08:00", "08:30"],
      "2026-06-16": ["09:00"],
    })];
    expect(classifyParticipants(p, dates)[0].totalSlots).toBe(3);
  });

  it("uses displayName over name", () => {
    const p = [makeParticipant("p1", "ALICE", "Alice", {})];
    expect(classifyParticipants(p, dates)[0].displayName).toBe("Alice");
  });

  it("falls back to name when displayName is empty", () => {
    const p = [makeParticipant("p1", "ALICE", "", {})];
    expect(classifyParticipants(p, dates)[0].displayName).toBe("ALICE");
  });
});

/* ------------------------------------------------------------------ */
/*  formatCopySummary                                                  */
/* ------------------------------------------------------------------ */

describe("formatCopySummary", () => {
  it("formats summary with recommendations", () => {
    const recs = [
      {
        date: "2026-06-15",
        start: "08:00",
        end: "10:00",
        participantCount: 8,
        totalParticipants: 10,
        durationMinutes: 120,
        participantNames: [],
        missingNames: [],
      },
      {
        date: "2026-06-16",
        start: "09:00",
        end: "11:00",
        participantCount: 7,
        totalParticipants: 10,
        durationMinutes: 120,
        participantNames: [],
        missingNames: [],
      },
    ];
    const text = formatCopySummary(
      recs,
      "Rapat Tim",
      10,
      "https://example.com/?id=abc",
    );
    expect(text).toContain("*Rapat Tim*");
    expect(text).toContain("Total peserta: 10");
    expect(text).toContain("*Top 2 Rekomendasi Jadwal*");
    expect(text).toContain("1.");
    expect(text).toContain("2.");
    expect(text).toContain("(8/10 peserta)");
    expect(text).toContain("(7/10 peserta)");
    expect(text).toContain("Link: https://example.com/?id=abc");
  });

  it("omits recommendations section when empty", () => {
    const text = formatCopySummary([], "Rapat", 5, "https://x.com");
    expect(text).toContain("*Rapat*");
    expect(text).toContain("Total peserta: 5");
    expect(text).not.toContain("Rekomendasi");
    expect(text).toContain("Link: https://x.com");
  });
});
