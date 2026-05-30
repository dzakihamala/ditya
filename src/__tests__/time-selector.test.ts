import { describe, it, expect } from "vitest";
import {
  generateSlots,
  add30Minutes,
  subtract30Minutes,
  timeToPixel,
  pixelToTime,
  toggleSlot,
  selectRange,
  deselectRange,
  isSlotSelected,
  slotsToRanges,
  getDateChipStatus,
  getConflictingSlots,
  getConflictsByDate,
  slotsInTimeRange,
  gridPixelToSlot,
  slotIndexToTime,
  getBlocks,
} from "@/lib/time-selector";

describe("generateSlots", () => {
  it("generates 30-min slots from startHour to endHour (exclusive)", () => {
    expect(generateSlots(8, 10)).toEqual([
      "08:00", "08:30", "09:00", "09:30",
    ]);
  });

  it("generates full workday slots", () => {
    const slots = generateSlots(8, 17);
    expect(slots.length).toBe(18); // 9 hours * 2
    expect(slots[0]).toBe("08:00");
    expect(slots[slots.length - 1]).toBe("16:30");
  });

  it("returns empty array when startHour equals endHour", () => {
    expect(generateSlots(9, 9)).toEqual([]);
  });

  it("returns empty array when startHour > endHour", () => {
    expect(generateSlots(10, 8)).toEqual([]);
  });

  it("handles non-integer hours", () => {
    const slots = generateSlots(7.5, 9.5);
    expect(slots).toEqual(["07:30", "08:00", "08:30", "09:00"]);
  });
});

describe("add30Minutes", () => {
  it("adds 30 minutes within same hour", () => {
    expect(add30Minutes("08:00")).toBe("08:30");
  });

  it("carries over to next hour", () => {
    expect(add30Minutes("08:30")).toBe("09:00");
  });

  it("handles hour boundary at midnight", () => {
    expect(add30Minutes("23:30")).toBe("00:00");
  });
});

describe("subtract30Minutes", () => {
  it("subtracts 30 minutes within same hour", () => {
    expect(subtract30Minutes("08:30")).toBe("08:00");
  });

  it("carries back to previous hour", () => {
    expect(subtract30Minutes("09:00")).toBe("08:30");
  });

  it("handles hour boundary at midnight", () => {
    expect(subtract30Minutes("00:00")).toBe("23:30");
  });
});

describe("timeToPixel", () => {
  const barWidth = 540;
  const startHour = 8;
  const endHour = 17;

  it("maps start of bar to pixel 0", () => {
    expect(timeToPixel("08:00", startHour, endHour, barWidth)).toBe(0);
  });

  it("maps end slot to correct position", () => {
    // 9 hours * 2 slots = 18 slots, last slot index 17
    expect(timeToPixel("16:30", startHour, endHour, barWidth)).toBe(17 * 30);
    // slotWidth = 540/18 = 30
  });

  it("maps a mid-day time correctly", () => {
    // 12:00 is 8 hours after 08:00 = 8 slots from start
    expect(timeToPixel("12:00", startHour, endHour, barWidth)).toBe(8 * 30);
  });

  it("returns 0 when totalSlots is 0", () => {
    expect(timeToPixel("08:00", 8, 8, barWidth)).toBe(0);
  });
});

describe("pixelToTime", () => {
  const barWidth = 540;
  const startHour = 8;
  const endHour = 17;

  it("converts pixel 0 to first slot", () => {
    expect(pixelToTime(0, startHour, endHour, barWidth)).toBe("08:00");
  });

  it("converts max pixel to last slot", () => {
    expect(pixelToTime(539, startHour, endHour, barWidth)).toBe("16:30");
  });

  it("snaps to nearest slot below", () => {
    // slotWidth = 30, pixel 45 → slot index 1 → 08:30
    expect(pixelToTime(45, startHour, endHour, barWidth)).toBe("08:30");
  });

  it("clamps negative pixel to first slot", () => {
    expect(pixelToTime(-10, startHour, endHour, barWidth)).toBe("08:00");
  });

  it("clamps positive overflow to last slot", () => {
    expect(pixelToTime(999, startHour, endHour, barWidth)).toBe("16:30");
  });
});

describe("toggleSlot", () => {
  it("adds a slot when not present", () => {
    expect(toggleSlot(["08:00"], "08:30")).toEqual(["08:00", "08:30"]);
  });

  it("removes a slot when present", () => {
    expect(toggleSlot(["08:00", "08:30"], "08:00")).toEqual(["08:30"]);
  });

  it("returns sorted slots after add", () => {
    expect(toggleSlot(["10:00"], "08:00")).toEqual(["08:00", "10:00"]);
  });

  it("handles empty initial array", () => {
    expect(toggleSlot([], "08:00")).toEqual(["08:00"]);
  });
});

describe("selectRange", () => {
  it("adds all slots in range", () => {
    expect(selectRange([], "08:00", "09:00")).toEqual([
      "08:00", "08:30", "09:00",
    ]);
  });

  it("merges with existing slots", () => {
    expect(selectRange(["10:00"], "08:00", "08:30")).toEqual([
      "08:00", "08:30", "10:00",
    ]);
  });

  it("handles reversed start/end", () => {
    expect(selectRange([], "09:00", "08:00")).toEqual([
      "08:00", "08:30", "09:00",
    ]);
  });

  it("does not duplicate existing slots", () => {
    expect(selectRange(["08:00", "08:30"], "08:00", "09:00")).toEqual([
      "08:00", "08:30", "09:00",
    ]);
  });
});

describe("deselectRange", () => {
  it("removes all slots in range", () => {
    expect(
      deselectRange(["08:00", "08:30", "09:00"], "08:00", "08:30"),
    ).toEqual(["09:00"]);
  });

  it("does nothing when range has no overlap", () => {
    const slots = ["08:00", "08:30"];
    expect(deselectRange(slots, "10:00", "11:00")).toEqual(["08:00", "08:30"]);
  });

  it("handles reversed start/end", () => {
    expect(
      deselectRange(["08:00", "08:30", "09:00"], "09:00", "08:00"),
    ).toEqual([]);
  });
});

describe("isSlotSelected", () => {
  it("returns true when slot is selected", () => {
    expect(isSlotSelected(["08:00", "08:30"], "08:00")).toBe(true);
  });

  it("returns false when slot is not selected", () => {
    expect(isSlotSelected(["08:00"], "08:30")).toBe(false);
  });

  it("returns false for empty slots", () => {
    expect(isSlotSelected([], "08:00")).toBe(false);
  });
});

describe("slotsToRanges", () => {
  it("returns empty array for empty slots", () => {
    expect(slotsToRanges([])).toEqual([]);
  });

  it("groups contiguous slots into ranges", () => {
    expect(slotsToRanges(["08:00", "08:30", "09:00"])).toEqual([
      { start: "08:00", end: "09:30" },
    ]);
  });

  it("handles multiple non-contiguous ranges", () => {
    expect(
      slotsToRanges(["08:00", "08:30", "10:00", "10:30"]),
    ).toEqual([
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "11:00" },
    ]);
  });

  it("handles single slot", () => {
    expect(slotsToRanges(["12:00"])).toEqual([
      { start: "12:00", end: "12:30" },
    ]);
  });

  it("sorts before grouping", () => {
    expect(
      slotsToRanges(["10:00", "08:00", "08:30"]),
    ).toEqual([
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "10:30" },
    ]);
  });

  it("handles three separate ranges", () => {
    expect(
      slotsToRanges(["08:00", "08:30", "12:00", "14:00", "14:30"]),
    ).toEqual([
      { start: "08:00", end: "09:00" },
      { start: "12:00", end: "12:30" },
      { start: "14:00", end: "15:00" },
    ]);
  });
});

describe("getDateChipStatus", () => {
  const availability = {
    "2026-06-15": ["08:00", "08:30"],
    "2026-06-16": [],
  };
  const activeDate = "2026-06-15";

  it("returns active for the current date", () => {
    expect(getDateChipStatus("2026-06-15", availability, activeDate)).toBe("active");
  });

  it("returns filled for date with slots", () => {
    // non-active date with slots
    expect(getDateChipStatus("2026-06-15", availability, "2026-06-16")).toBe("filled");
  });

  it("returns skipped for date with empty array", () => {
    expect(getDateChipStatus("2026-06-16", availability, activeDate)).toBe("skipped");
  });

  it("returns pending for date not in availability", () => {
    expect(getDateChipStatus("2026-06-17", availability, activeDate)).toBe("pending");
  });

  it("active takes precedence over filled", () => {
    expect(getDateChipStatus("2026-06-15", availability, "2026-06-15")).toBe("active");
  });

  it("skipped date still shows skipped when active", () => {
    expect(getDateChipStatus("2026-06-16", availability, "2026-06-16")).toBe("active");
  });
});

describe("getConflictingSlots", () => {
  const date = "2026-06-15";
  const startHour = 8;
  const endHour = 17;

  it("returns empty array for no events", () => {
    expect(getConflictingSlots([], date, startHour, endHour)).toEqual([]);
  });

  it("finds conflicting slots from an event within window", () => {
    const events = [
      {
        start: "2026-06-15T09:00:00",
        end: "2026-06-15T10:00:00",
      },
    ];
    const conflicts = getConflictingSlots(events, date, startHour, endHour);
    expect(conflicts).toEqual(["09:00", "09:30"]);
  });

  it("ignores events on different dates", () => {
    const events = [
      {
        start: "2026-06-16T09:00:00",
        end: "2026-06-16T10:00:00",
      },
    ];
    expect(getConflictingSlots(events, date, startHour, endHour)).toEqual([]);
  });

  it("clips events to the display window", () => {
    const events = [
      {
        start: "2026-06-15T07:00:00",
        end: "2026-06-15T09:00:00",
      },
    ];
    const conflicts = getConflictingSlots(events, date, startHour, endHour);
    // Event overlaps 08:00-08:30 within the window
    expect(conflicts).toEqual(["08:00", "08:30"]);
  });

  it("handles events spanning multiple days", () => {
    const events = [
      {
        start: "2026-06-14T22:00:00",
        end: "2026-06-15T10:00:00",
      },
    ];
    const conflicts = getConflictingSlots(events, date, startHour, endHour);
    expect(conflicts).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });

  it("skips invalid date strings", () => {
    const events = [
      {
        start: "not-a-date",
        end: "also-not-a-date",
      },
    ];
    expect(getConflictingSlots(events, date, startHour, endHour)).toEqual([]);
  });

  it("handles all-day events with date-only strings", () => {
    const events = [
      {
        start: "2026-06-15",
        end: "2026-06-16",
      },
    ];
    const conflicts = getConflictingSlots(events, date, startHour, endHour);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toBe("08:00");
  });
});

describe("getConflictsByDate", () => {
  it("maps conflicts per meeting date without merging times across days", () => {
    const events = [
      {
        start: "2026-06-15T09:00:00",
        end: "2026-06-15T10:00:00",
      },
      {
        start: "2026-06-16T14:00:00",
        end: "2026-06-16T15:00:00",
      },
    ];
    expect(
      getConflictsByDate(events, ["2026-06-15", "2026-06-16"], 8, 17),
    ).toEqual({
      "2026-06-15": ["09:00", "09:30"],
      "2026-06-16": ["14:00", "14:30"],
    });
  });
});

describe("slotsInTimeRange", () => {
  it("includes every slot that starts before the block end time", () => {
    expect(slotsInTimeRange("08:00", "09:00", 8, 17)).toEqual([
      "08:00",
      "08:30",
    ]);
  });
});

describe("gridPixelToSlot", () => {
  const dates = ["2026-06-15", "2026-06-16", "2026-06-17"];
  const COL_WIDTH = 80;
  const CELL_HEIGHT = 28;
  const startHour = 8;
  const endHour = 10;

  it("maps top-left pixel to first date, first slot", () => {
    const result = gridPixelToSlot(0, 0, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toEqual({ date: "2026-06-15", time: "08:00" });
  });

  it("maps second column to second date", () => {
    const result = gridPixelToSlot(80, 0, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toEqual({ date: "2026-06-16", time: "08:00" });
  });

  it("maps second row to 08:30", () => {
    const result = gridPixelToSlot(0, 28, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toEqual({ date: "2026-06-15", time: "08:30" });
  });

  it("returns null for x beyond last column", () => {
    const result = gridPixelToSlot(300, 0, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toBeNull();
  });

  it("returns null for negative x", () => {
    const result = gridPixelToSlot(-10, 0, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toBeNull();
  });

  it("returns null for y beyond last row", () => {
    const result = gridPixelToSlot(0, 999, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toBeNull();
  });

  it("returns null for negative y", () => {
    const result = gridPixelToSlot(0, -10, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toBeNull();
  });

  it("returns null for empty dates array", () => {
    const result = gridPixelToSlot(0, 0, COL_WIDTH, CELL_HEIGHT, [], startHour, endHour);
    expect(result).toBeNull();
  });

  it("handles x at the boundary of the last column", () => {
    const result = gridPixelToSlot(239, 0, COL_WIDTH, CELL_HEIGHT, dates, startHour, endHour);
    expect(result).toEqual({ date: "2026-06-17", time: "08:00" });
  });
});

describe("slotIndexToTime", () => {
  it("converts slot index 0 at startHour 8 to 08:00", () => {
    expect(slotIndexToTime(0, 8)).toBe("08:00");
  });

  it("converts slot index 1 to 08:30", () => {
    expect(slotIndexToTime(1, 8)).toBe("08:30");
  });

  it("handles non-integer startHour", () => {
    expect(slotIndexToTime(0, 7.5)).toBe("07:30");
  });
});

describe("getBlocks", () => {
  const dates = ["2026-06-15", "2026-06-16"];

  it("returns empty array for empty availability", () => {
    expect(getBlocks({}, dates)).toEqual([]);
  });

  it("extracts contiguous blocks from availability", () => {
    const avail = { "2026-06-15": ["08:00", "08:30", "09:00"] };
    expect(getBlocks(avail, dates)).toEqual([
      { date: "2026-06-15", startTime: "08:00", endTime: "09:30" },
    ]);
  });

  it("extracts multiple blocks across dates", () => {
    const avail = {
      "2026-06-15": ["08:00", "08:30"],
      "2026-06-16": ["12:00", "12:30", "14:00", "14:30"],
    };
    expect(getBlocks(avail, dates)).toEqual([
      { date: "2026-06-15", startTime: "08:00", endTime: "09:00" },
      { date: "2026-06-16", startTime: "12:00", endTime: "13:00" },
      { date: "2026-06-16", startTime: "14:00", endTime: "15:00" },
    ]);
  });

  it("handles skipped dates (empty array)", () => {
    const avail = { "2026-06-15": [] };
    expect(getBlocks(avail, dates)).toEqual([]);
  });

  it("only returns blocks for dates in the dates array", () => {
    const avail = { "2026-06-15": ["08:00"], "2026-12-25": ["10:00"] };
    expect(getBlocks(avail, ["2026-06-15"])).toEqual([
      { date: "2026-06-15", startTime: "08:00", endTime: "08:30" },
    ]);
  });
});
