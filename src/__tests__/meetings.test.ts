import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDaysInMonth,
  getMonthGrid,
  toggleDate,
  selectDateRange,
  formatDate,
  parseDate,
  floatToTimeStr,
  timeStrToFloat,
  formatDateShort,
} from "@/lib/date-utils";
import {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
} from "@/lib/meetings";
import type { Firestore } from "firebase/firestore";

/* ------------------------------------------------------------------ */
/*  Date utilities                                                     */
/* ------------------------------------------------------------------ */

describe("getDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(getDaysInMonth(2025, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it("returns 30 for April", () => {
    expect(getDaysInMonth(2026, 3)).toBe(30);
  });
});

describe("getMonthGrid", () => {
  it("returns 4–6 rows and 7 columns per row", () => {
    const grid = getMonthGrid(2026, 4); // May 2026
    expect(grid.length).toBeGreaterThanOrEqual(4);
    expect(grid.length).toBeLessThanOrEqual(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
    }
  });

  it("starts with nulls for days before the 1st", () => {
    // May 2026 starts on a Friday (day 5)
    const grid = getMonthGrid(2026, 4);
    expect(grid[0][0]).toBeNull();
    expect(grid[0][4]).toBeNull();
    expect(grid[0][5]).toBe("2026-05-01");
  });

  it("contains all days of the month", () => {
    const grid = getMonthGrid(2026, 0); // January 2026
    const days = grid.flat().filter(Boolean);
    expect(days).toHaveLength(31);
    expect(days[0]).toBe("2026-01-01");
    expect(days[30]).toBe("2026-01-31");
  });
});

describe("toggleDate", () => {
  it("adds a date when not present", () => {
    expect(toggleDate(["2026-06-01"], "2026-06-02")).toEqual([
      "2026-06-01",
      "2026-06-02",
    ]);
  });

  it("removes a date when already present", () => {
    expect(toggleDate(["2026-06-01", "2026-06-02"], "2026-06-01")).toEqual([
      "2026-06-02",
    ]);
  });

  it("returns sorted dates", () => {
    expect(toggleDate(["2026-06-10"], "2026-06-01")).toEqual([
      "2026-06-01",
      "2026-06-10",
    ]);
  });
});

describe("selectDateRange", () => {
  it("adds a range of dates inclusively", () => {
    const result = selectDateRange([], "2026-06-01", "2026-06-05");
    expect(result).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });

  it("works regardless of argument order", () => {
    const result = selectDateRange([], "2026-06-05", "2026-06-01");
    expect(result).toHaveLength(5);
    expect(result[0]).toBe("2026-06-01");
  });

  it("merges with existing selection", () => {
    const result = selectDateRange(
      ["2026-06-01", "2026-06-10"],
      "2026-06-03",
      "2026-06-07",
    );
    expect(result).toContain("2026-06-01");
    expect(result).toContain("2026-06-05");
    expect(result).toContain("2026-06-10");
  });
});

describe("formatDate", () => {
  it("formats correctly", () => {
    expect(formatDate(2026, 0, 5)).toBe("2026-01-05");
    expect(formatDate(2026, 11, 31)).toBe("2026-12-31");
  });
});

describe("parseDate", () => {
  it("parses a YYYY-MM-DD string", () => {
    const d = parseDate("2026-06-15");
    expect(d.year).toBe(2026);
    expect(d.month).toBe(5); // zero-indexed
    expect(d.day).toBe(15);
  });
});

describe("floatToTimeStr", () => {
  it("converts whole hours", () => {
    expect(floatToTimeStr(7)).toBe("07:00");
  });

  it("converts fractional hours", () => {
    expect(floatToTimeStr(7.5)).toBe("07:30");
    expect(floatToTimeStr(12.75)).toBe("12:45");
  });

  it("handles midnight", () => {
    expect(floatToTimeStr(0)).toBe("00:00");
  });

  it("handles 23:59", () => {
    expect(floatToTimeStr(23.983)).toBe("23:59");
  });
});

describe("timeStrToFloat", () => {
  it("converts whole hours", () => {
    expect(timeStrToFloat("07:00")).toBe(7);
  });

  it("converts fractional hours", () => {
    expect(timeStrToFloat("07:30")).toBe(7.5);
    expect(timeStrToFloat("12:45")).toBe(12.75);
  });
});

/* ------------------------------------------------------------------ */
/*  Meeting CRUD (mocked Firestore)                                    */
/* ------------------------------------------------------------------ */

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, _col: string, id?: string) =>
  id ? { _id: id } : {},
);
const mockCollection = vi.fn((_db: unknown, _name: string) => ({}));
const mockQuery = vi.fn((_col: unknown, _orderBy: unknown) => ({}));
const mockOrderBy = vi.fn((_field: string, _dir: string) => ({}));

vi.mock("firebase/firestore", () => ({
  collection: (db: unknown, name: string) => mockCollection(db, name),
  addDoc: (ref: unknown, data: unknown) => mockAddDoc(ref, data),
  getDocs: (q: unknown) => mockGetDocs(q),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  deleteDoc: (ref: unknown) => mockDeleteDoc(ref),
  updateDoc: (ref: unknown, data: unknown) => mockUpdateDoc(ref, data),
  doc: (db: unknown, col: string, id?: string) => mockDoc(db, col, id),
  query: (col: unknown, ob: unknown) => mockQuery(col, ob),
  orderBy: (field: string, dir: string) => mockOrderBy(field, dir),
}));

function fakeDb() {
  return {} as Firestore;
}

function fakeDocSnap(data: Record<string, unknown>) {
  return {
    exists: () => true,
    id: "abc123",
    data: () => data,
  };
}

function fakeEmptySnap() {
  return { exists: () => false, id: "", data: () => ({} as never) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createMeeting", () => {
  it("calls addDoc on the meetings collection with correct fields", async () => {
    mockAddDoc.mockResolvedValueOnce({ id: "meeting-1" });

    const id = await createMeeting(fakeDb(), {
      eventName: "Rapat Tim",
      dates: ["2026-06-15", "2026-06-16"],
      startHour: 7.5,
      endHour: 12.75,
    });

    expect(id).toBe("meeting-1");
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "meetings");
    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const callData = mockAddDoc.mock.calls[0][1];
    expect(callData.eventName).toBe("Rapat Tim");
    expect(callData.dates).toEqual(["2026-06-15", "2026-06-16"]);
    expect(callData.startHour).toBe(7.5);
    expect(callData.endHour).toBe(12.75);
    expect(callData.createdAt).toBeDefined();
    expect(callData.updatedAt).toBeDefined();
  });
});

describe("getMeetings", () => {
  it("returns meetings sorted by createdAt desc", async () => {
    const docs = [
      {
        id: "m1",
        data: () => ({
          eventName: "Second",
          dates: [],
          startHour: 8,
          endHour: 10,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        }),
      },
      {
        id: "m2",
        data: () => ({
          eventName: "First",
          dates: [],
          startHour: 9,
          endHour: 11,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const meetings = await getMeetings(fakeDb());

    expect(meetings).toHaveLength(2);
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(meetings[0].eventName).toBe("Second");
    expect(meetings[1].eventName).toBe("First");
  });
});

describe("getMeeting", () => {
  it("returns a meeting by id", async () => {
    mockGetDoc.mockResolvedValueOnce(
      fakeDocSnap({ eventName: "Rapat", dates: [], startHour: 8, endHour: 10, createdAt: "", updatedAt: "" }),
    );

    const m = await getMeeting(fakeDb(), "abc123");
    expect(m).not.toBeNull();
    expect(m!.eventName).toBe("Rapat");
  });

  it("returns null for missing meeting", async () => {
    mockGetDoc.mockResolvedValueOnce(fakeEmptySnap());

    const m = await getMeeting(fakeDb(), "nope");
    expect(m).toBeNull();
  });
});

describe("updateMeeting", () => {
  it("calls updateDoc with partial data and updatedAt", async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await updateMeeting(fakeDb(), "abc123", { eventName: "Updated" });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const callData = mockUpdateDoc.mock.calls[0][1];
    expect(callData.eventName).toBe("Updated");
    expect(callData.updatedAt).toBeDefined();
  });
});

describe("deleteMeeting", () => {
  it("calls deleteDoc on the meeting document", async () => {
    mockDeleteDoc.mockResolvedValueOnce(undefined);

    await deleteMeeting(fakeDb(), "abc123");

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
