import { describe, it, expect } from "vitest";
import {
  createInitialState,
  wizardReducer,
  getReviewItems,
  isDateCompleted,
  getCompletedCount,
  isAllDatesCompleted,
} from "@/lib/wizard";
import type { WizardState } from "@/lib/wizard";

const DATES = ["2026-06-15", "2026-06-16", "2026-06-17"];

describe("Wizard Engine — state transitions", () => {
  it("starts in loading state", () => {
    const s = createInitialState();
    expect(s.step).toBe("loading");
    expect(s.error).toBeNull();
    expect(s.dates).toEqual([]);
  });

  describe("LOAD_MEETING_OK", () => {
    it("transitions to input step with meeting data", () => {
      const s = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_OK",
        meetingTitle: "Test Rapat",
        dates: DATES,
        startHour: 8,
        endHour: 17,
      });
      expect(s.step).toBe("input");
      expect(s.meetingTitle).toBe("Test Rapat");
      expect(s.dates).toEqual(DATES);
      expect(s.startHour).toBe(8);
      expect(s.endHour).toBe(17);
      expect(s.error).toBeNull();
    });
  });

  describe("LOAD_MEETING_FAIL", () => {
    it("stays in loading and sets error", () => {
      const s = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_FAIL",
        error: "Not found",
      });
      expect(s.step).toBe("loading");
      expect(s.error).toBe("Not found");
    });
  });

  describe("NAME_CONFIRMED", () => {
    it("transitions to gcal step with participant info", () => {
      const base = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_OK",
        meetingTitle: "Test",
        dates: DATES,
        startHour: 8,
        endHour: 17,
      });

      const s = wizardReducer(base, {
        type: "NAME_CONFIRMED",
        displayName: "Alice",
        participantId: "abc123",
      });

      expect(s.step).toBe("gcal");
      expect(s.displayName).toBe("Alice");
      expect(s.participantId).toBe("abc123");
      expect(s.activeDateIndex).toBe(0);
    });

    it("restores existing availability", () => {
      const base = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_OK",
        meetingTitle: "Test",
        dates: DATES,
        startHour: 8,
        endHour: 17,
      });

      const s = wizardReducer(base, {
        type: "NAME_CONFIRMED",
        displayName: "Bob",
        participantId: "xyz",
        availability: { "2026-06-15": ["08:00", "08:30"], "2026-06-16": [] },
      });

      expect(s.availability["2026-06-15"]).toEqual(["08:00", "08:30"]);
      expect(s.availability["2026-06-16"]).toEqual([]);
      // activeDateIndex should be 2 (first pending = Jun 17)
      expect(s.activeDateIndex).toBe(2);
    });

    it("sets activeDateIndex to first pending when all but last are done", () => {
      const base = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_OK",
        meetingTitle: "Test",
        dates: DATES,
        startHour: 8,
        endHour: 17,
      });

      const s = wizardReducer(base, {
        type: "NAME_CONFIRMED",
        displayName: "Cat",
        participantId: "c",
        availability: { "2026-06-15": ["08:00"], "2026-06-16": ["09:00"] },
      });

      expect(s.activeDateIndex).toBe(2); // Jun 17 is first pending
    });

    it("sets activeDateIndex to 0 when all dates already completed", () => {
      const base = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_OK",
        meetingTitle: "Test",
        dates: DATES,
        startHour: 8,
        endHour: 17,
      });

      const s = wizardReducer(base, {
        type: "NAME_CONFIRMED",
        displayName: "Dan",
        participantId: "d",
        availability: {
          "2026-06-15": ["08:00"],
          "2026-06-16": ["09:00"],
          "2026-06-17": [],
        },
      });

      expect(s.activeDateIndex).toBe(0); // all completed, fallback to 0
    });

    it("clears error", () => {
      const base = wizardReducer(createInitialState(), {
        type: "LOAD_MEETING_FAIL",
        error: "oops",
      });

      const s = wizardReducer(base, {
        type: "NAME_CONFIRMED",
        displayName: "Eve",
        participantId: "e",
      });

      expect(s.error).toBeNull();
    });
  });

  describe("SKIP_GCAL", () => {
    it("transitions to select-time without GCal", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "gcal",
        dates: DATES,
        meetingTitle: "T",
      };

      const s = wizardReducer(base, { type: "SKIP_GCAL" });
      expect(s.step).toBe("select-time");
      expect(s.gcalConnected).toBe(false);
    });
  });

  describe("GCAL_CONNECTED", () => {
    it("transitions to gcal-conflicts with empty events", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "gcal",
        dates: DATES,
        meetingTitle: "T",
      };

      const s = wizardReducer(base, { type: "GCAL_CONNECTED" });
      expect(s.step).toBe("gcal-conflicts");
      expect(s.gcalEvents).toEqual([]);
      expect(s.gcalConnected).toBe(true);
    });
  });

  describe("GCAL_EVENTS_LOADED", () => {
    it("transitions to gcal-conflicts with fetched events", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "gcal",
        dates: DATES,
        meetingTitle: "T",
      };

      const events = [
        { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "Meeting A" },
        { start: "2026-06-16T14:00:00", end: "2026-06-16T15:00:00", summary: "Dentist" },
      ];

      const s = wizardReducer(base, { type: "GCAL_EVENTS_LOADED", events });
      expect(s.step).toBe("gcal-conflicts");
      expect(s.gcalEvents).toEqual(events);
      expect(s.gcalConnected).toBe(true);
    });
  });

  describe("GCAL_CONFLICTS_CONFIRMED", () => {
    it("transitions to select-time with conflict slots", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "gcal-conflicts",
        dates: DATES,
        meetingTitle: "T",
        gcalEvents: [
          { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "Meeting A" },
        ],
      };

      const s = wizardReducer(base, {
        type: "GCAL_CONFLICTS_CONFIRMED",
        conflictSlots: ["09:00", "09:30"],
        selectedEvents: [
          { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "Meeting A" },
        ],
      });

      expect(s.step).toBe("select-time");
      expect(s.conflictSlots).toEqual(["09:00", "09:30"]);
      expect(s.gcalConnected).toBe(true);
    });

    it("goes to select-time with empty conflicts when no events selected", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "gcal-conflicts",
        dates: DATES,
        meetingTitle: "T",
        gcalEvents: [],
      };

      const s = wizardReducer(base, {
        type: "GCAL_CONFLICTS_CONFIRMED",
        conflictSlots: [],
        selectedEvents: [],
      });

      expect(s.step).toBe("select-time");
      expect(s.conflictSlots).toEqual([]);
      expect(s.gcalConnected).toBe(true);
    });
  });

  describe("SET_DATE_INDEX", () => {
    it("updates active date index within bounds", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
      };

      const s = wizardReducer(base, { type: "SET_DATE_INDEX", index: 2 });
      expect(s.activeDateIndex).toBe(2);
    });

    it("rejects negative index", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        activeDateIndex: 0,
      };

      const s = wizardReducer(base, { type: "SET_DATE_INDEX", index: -1 });
      expect(s.activeDateIndex).toBe(0); // unchanged
    });

    it("rejects index beyond bounds", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        activeDateIndex: 0,
      };

      const s = wizardReducer(base, { type: "SET_DATE_INDEX", index: 99 });
      expect(s.activeDateIndex).toBe(0); // unchanged
    });
  });

  describe("UPDATE_SLOTS", () => {
    it("stores slots for a given date", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        availability: {},
      };

      const s = wizardReducer(base, {
        type: "UPDATE_SLOTS",
        date: "2026-06-15",
        slots: ["08:00", "08:30"],
      });

      expect(s.availability["2026-06-15"]).toEqual(["08:00", "08:30"]);
    });

    it("replaces previously stored slots for same date", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        availability: { "2026-06-15": ["08:00"] },
      };

      const s = wizardReducer(base, {
        type: "UPDATE_SLOTS",
        date: "2026-06-15",
        slots: ["10:00", "10:30"],
      });

      expect(s.availability["2026-06-15"]).toEqual(["10:00", "10:30"]);
    });

    it("does not remove other dates availability", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        availability: { "2026-06-15": ["08:00"], "2026-06-16": [] },
      };

      const s = wizardReducer(base, {
        type: "UPDATE_SLOTS",
        date: "2026-06-15",
        slots: ["10:00"],
      });

      expect(s.availability["2026-06-16"]).toEqual([]);
    });

    it("clears error on update", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        availability: {},
        error: "some error",
      };

      const s = wizardReducer(base, {
        type: "UPDATE_SLOTS",
        date: "2026-06-15",
        slots: [],
      });

      expect(s.error).toBeNull();
    });
  });

  describe("GO_TO_REVIEW", () => {
    it("transitions to review step", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
      };

      const s = wizardReducer(base, { type: "GO_TO_REVIEW" });
      expect(s.step).toBe("review");
    });
  });

  describe("GO_TO_EDIT", () => {
    it("returns to select-time with correct date index", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "review",
        dates: DATES,
        availability: {
          "2026-06-15": ["08:00"],
          "2026-06-17": [],
        },
      };

      const s = wizardReducer(base, {
        type: "GO_TO_EDIT",
        date: "2026-06-17",
      });

      expect(s.step).toBe("select-time");
      expect(s.activeDateIndex).toBe(2);
    });

    it("returns unchanged state for unknown date", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "review",
        dates: DATES,
      };

      const s = wizardReducer(base, {
        type: "GO_TO_EDIT",
        date: "2026-12-25",
      });

      expect(s).toBe(base);
    });
  });

  describe("START_MODIFY", () => {
    it("transitions from input to modify with participant info", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "input",
        dates: DATES,
        meetingTitle: "T",
      };

      const s = wizardReducer(base, {
        type: "START_MODIFY",
        displayName: "Returning User",
        participantId: "p1",
        availability: { "2026-06-15": ["08:00"], "2026-06-16": [] },
      });

      expect(s.step).toBe("modify");
      expect(s.displayName).toBe("Returning User");
      expect(s.participantId).toBe("p1");
      expect(s.availability["2026-06-15"]).toEqual(["08:00"]);
      expect(s.error).toBeNull();
    });
  });

  describe("MODIFY_RESET_ALL", () => {
    it("clears availability and goes to gcal step", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "modify",
        dates: DATES,
        meetingTitle: "T",
        availability: { "2026-06-15": ["08:00"], "2026-06-16": [] },
      };

      const s = wizardReducer(base, { type: "MODIFY_RESET_ALL" });

      expect(s.step).toBe("gcal");
      expect(s.availability).toEqual({});
      expect(s.activeDateIndex).toBe(0);
    });
  });

  describe("MODIFY_SINGLE_DATE", () => {
    it("goes to select-time with the chosen date active", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "modify",
        dates: DATES,
        meetingTitle: "T",
      };

      const s = wizardReducer(base, {
        type: "MODIFY_SINGLE_DATE",
        date: "2026-06-17",
      });

      expect(s.step).toBe("select-time");
      expect(s.activeDateIndex).toBe(2);
    });

    it("returns unchanged for unknown date", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "modify",
        dates: DATES,
      };

      const s = wizardReducer(base, {
        type: "MODIFY_SINGLE_DATE",
        date: "2026-12-25",
      });

      expect(s).toBe(base);
    });
  });

  describe("MODIFY_DONE", () => {
    it("returns to review after partial edit", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "select-time",
        dates: DATES,
        availability: { "2026-06-15": ["08:00"] },
      };

      const s = wizardReducer(base, { type: "MODIFY_DONE" });

      expect(s.step).toBe("review");
    });
  });

  describe("CONFIRM_SAVE", () => {
    it("transitions to saved and sets confirmedAt timestamp", () => {
      const base: WizardState = {
        ...createInitialState(),
        step: "review",
        dates: DATES,
        availability: { "2026-06-15": ["08:00"] },
      };

      const s = wizardReducer(base, { type: "CONFIRM_SAVE" });
      expect(s.step).toBe("saved");
      expect(s.confirmedAt).toBeTruthy();
      expect(new Date(s.confirmedAt!).getTime()).toBeGreaterThan(0);
    });
  });

  describe("SET_ERROR / CLEAR_ERROR", () => {
    it("sets error on state", () => {
      const s = wizardReducer(createInitialState(), {
        type: "SET_ERROR",
        error: "Network down",
      });
      expect(s.error).toBe("Network down");
    });

    it("clears error", () => {
      const base: WizardState = {
        ...createInitialState(),
        error: "some error",
      };

      const s = wizardReducer(base, { type: "CLEAR_ERROR" });
      expect(s.error).toBeNull();
    });
  });

  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const base = createInitialState();
      // @ts-expect-error testing unknown action
      const s = wizardReducer(base, { type: "UNKNOWN" });
      expect(s).toBe(base);
    });
  });
});

describe("Wizard Engine — review aggregation", () => {
  it("marks dates with slots as filled", () => {
    const items = getReviewItems(
      { "2026-06-15": ["08:00", "08:30", "09:00"] },
      DATES,
    );
    expect(items[0].status).toBe("filled");
    // contiguous range 08:00–09:30
    expect(items[0].ranges).toEqual([{ start: "08:00", end: "09:30" }]);
  });

  it("marks dates with empty array as skipped", () => {
    const items = getReviewItems({ "2026-06-15": [] }, DATES);
    expect(items[0].status).toBe("skipped");
    expect(items[0].ranges).toEqual([]);
  });

  it("marks dates missing from availability as pending", () => {
    const items = getReviewItems({}, DATES);
    items.forEach((item) => {
      expect(item.status).toBe("pending");
      expect(item.ranges).toEqual([]);
    });
  });

  it("shows non-contiguous ranges separately", () => {
    const items = getReviewItems(
      { "2026-06-15": ["08:00", "08:30", "10:00", "10:30", "14:00"] },
      DATES,
    );
    expect(items[0].ranges).toEqual([
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "11:00" },
      { start: "14:00", end: "14:30" },
    ]);
  });

  it("handles mixed statuses across dates", () => {
    const items = getReviewItems(
      {
        "2026-06-15": ["08:00"],
        "2026-06-16": [],
      },
      DATES,
    );
    expect(items[0]).toMatchObject({ date: "2026-06-15", status: "filled" });
    expect(items[1]).toMatchObject({ date: "2026-06-16", status: "skipped" });
    expect(items[2]).toMatchObject({ date: "2026-06-17", status: "pending" });
  });
});

describe("Wizard Engine — completion checks", () => {
  describe("isDateCompleted", () => {
    it("returns true for filled date", () => {
      expect(isDateCompleted({ "2026-06-15": ["08:00"] }, "2026-06-15")).toBe(true);
    });

    it("returns true for skipped date (empty array)", () => {
      expect(isDateCompleted({ "2026-06-15": [] }, "2026-06-15")).toBe(true);
    });

    it("returns false for date not in availability", () => {
      expect(isDateCompleted({}, "2026-06-15")).toBe(false);
      expect(isDateCompleted({ "2026-06-16": [] }, "2026-06-15")).toBe(false);
    });
  });

  describe("getCompletedCount", () => {
    it("counts filled and skipped dates", () => {
      const count = getCompletedCount(
        { "2026-06-15": ["08:00"], "2026-06-16": [] },
        DATES,
      );
      expect(count).toBe(2);
    });

    it("returns 0 when nothing completed", () => {
      expect(getCompletedCount({}, DATES)).toBe(0);
    });

    it("returns 0 when dates array is empty", () => {
      expect(getCompletedCount({ "2026-06-15": ["08:00"] }, [])).toBe(0);
    });
  });

  describe("isAllDatesCompleted", () => {
    it("returns true when all dates are filled or skipped", () => {
      expect(
        isAllDatesCompleted(
          {
            "2026-06-15": ["08:00"],
            "2026-06-16": [],
            "2026-06-17": ["10:00"],
          },
          DATES,
        ),
      ).toBe(true);
    });

    it("returns false when any date is pending", () => {
      expect(
        isAllDatesCompleted(
          { "2026-06-15": ["08:00"] },
          DATES,
        ),
      ).toBe(false);
    });

    it("returns false for empty dates", () => {
      expect(isAllDatesCompleted({}, [])).toBe(false);
    });
  });
});

describe("Wizard Engine — full wizard flow scenarios", () => {
  it("happy path: input → gcal (skip) → select-time all dates → review → saved", () => {
    let s = createInitialState();

    s = wizardReducer(s, {
      type: "LOAD_MEETING_OK",
      meetingTitle: "Rapat Akbar",
      dates: DATES,
      startHour: 8,
      endHour: 17,
    });
    expect(s.step).toBe("input");

    s = wizardReducer(s, {
      type: "NAME_CONFIRMED",
      displayName: "Alice",
      participantId: "p1",
    });
    expect(s.step).toBe("gcal");

    s = wizardReducer(s, { type: "SKIP_GCAL" });
    expect(s.step).toBe("select-time");
    expect(s.activeDateIndex).toBe(0);

    // Fill date 1
    s = wizardReducer(s, {
      type: "UPDATE_SLOTS",
      date: "2026-06-15",
      slots: ["08:00", "08:30"],
    });
    expect(s.availability["2026-06-15"]).toHaveLength(2);

    // Go to date 2
    s = wizardReducer(s, { type: "SET_DATE_INDEX", index: 1 });
    expect(s.activeDateIndex).toBe(1);

    // Skip date 2
    s = wizardReducer(s, {
      type: "UPDATE_SLOTS",
      date: "2026-06-16",
      slots: [],
    });

    // Go to date 3
    s = wizardReducer(s, { type: "SET_DATE_INDEX", index: 2 });

    // Fill date 3
    s = wizardReducer(s, {
      type: "UPDATE_SLOTS",
      date: "2026-06-17",
      slots: ["10:00", "10:30"],
    });

    // Go to review
    s = wizardReducer(s, { type: "GO_TO_REVIEW" });
    expect(s.step).toBe("review");

    // Edit a date
    s = wizardReducer(s, { type: "GO_TO_EDIT", date: "2026-06-15" });
    expect(s.step).toBe("select-time");
    expect(s.activeDateIndex).toBe(0);

    // Return to review
    s = wizardReducer(s, { type: "GO_TO_REVIEW" });
    expect(s.step).toBe("review");

    // Confirm save
    s = wizardReducer(s, { type: "CONFIRM_SAVE" });
    expect(s.step).toBe("saved");
    expect(s.confirmedAt).toBeTruthy();
  });

  it("gcal connected path: input → gcal (connect) → gcal-conflicts → select-time → review → saved", () => {
    let s = createInitialState();

    s = wizardReducer(s, {
      type: "LOAD_MEETING_OK",
      meetingTitle: "Rapat",
      dates: DATES,
      startHour: 8,
      endHour: 17,
    });

    s = wizardReducer(s, {
      type: "NAME_CONFIRMED",
      displayName: "Bob",
      participantId: "p2",
    });

    const events = [
      { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "Meeting A" },
    ];

    s = wizardReducer(s, { type: "GCAL_EVENTS_LOADED", events });
    expect(s.step).toBe("gcal-conflicts");
    expect(s.gcalEvents).toEqual(events);
    expect(s.gcalConnected).toBe(true);

    s = wizardReducer(s, {
      type: "GCAL_CONFLICTS_CONFIRMED",
      conflictSlots: ["09:00", "09:30"],
      selectedEvents: [events[0]],
    });
    expect(s.step).toBe("select-time");
    expect(s.gcalConnected).toBe(true);
    expect(s.conflictSlots).toEqual(["09:00", "09:30"]);
  });

  it("returning participant starts modify flow instead of gcal", () => {
    let s = createInitialState();

    s = wizardReducer(s, {
      type: "LOAD_MEETING_OK",
      meetingTitle: "Rapat",
      dates: DATES,
      startHour: 8,
      endHour: 17,
    });

    s = wizardReducer(s, {
      type: "START_MODIFY",
      displayName: "Returning User",
      participantId: "existing-id",
      availability: {
        "2026-06-15": ["08:00", "09:00"],
        "2026-06-16": [],
      },
    });

    expect(s.step).toBe("modify");
    expect(s.displayName).toBe("Returning User");
    expect(s.participantId).toBe("existing-id");
    expect(s.availability["2026-06-15"]).toEqual(["08:00", "09:00"]);
    expect(s.availability["2026-06-16"]).toEqual([]);
    expect(s.error).toBeNull();
  });

  it("duplicate participant restoring data jumps to gcal step", () => {
    let s = createInitialState();

    s = wizardReducer(s, {
      type: "LOAD_MEETING_OK",
      meetingTitle: "Rapat",
      dates: DATES,
      startHour: 8,
      endHour: 17,
    });

    s = wizardReducer(s, {
      type: "NAME_CONFIRMED",
      displayName: "Returning User",
      participantId: "existing-id",
      availability: {
        "2026-06-15": ["08:00", "09:00"],
        "2026-06-16": [],
      },
    });

    expect(s.step).toBe("gcal");
    expect(s.availability["2026-06-15"]).toEqual(["08:00", "09:00"]);
    expect(s.availability["2026-06-16"]).toEqual([]);
    expect(s.activeDateIndex).toBe(2); // first pending is Jun 17
  });

  it("modify single date: partial update does not touch other dates", () => {
    let s = createInitialState();

    s = wizardReducer(s, {
      type: "LOAD_MEETING_OK",
      meetingTitle: "Rapat",
      dates: DATES,
      startHour: 8,
      endHour: 17,
    });

    s = wizardReducer(s, {
      type: "START_MODIFY",
      displayName: "User",
      participantId: "p1",
      availability: {
        "2026-06-15": ["08:00", "08:30"],
        "2026-06-16": ["09:00"],
        "2026-06-17": [],
      },
    });
    expect(s.step).toBe("modify");

    // Pick date Jun 16 to modify
    s = wizardReducer(s, {
      type: "MODIFY_SINGLE_DATE",
      date: "2026-06-16",
    });
    expect(s.step).toBe("select-time");
    expect(s.activeDateIndex).toBe(1);

    // Change Jun 16 slots
    s = wizardReducer(s, {
      type: "UPDATE_SLOTS",
      date: "2026-06-16",
      slots: ["10:00", "10:30"],
    });

    // Other dates untouched
    expect(s.availability["2026-06-15"]).toEqual(["08:00", "08:30"]);
    expect(s.availability["2026-06-16"]).toEqual(["10:00", "10:30"]);
    expect(s.availability["2026-06-17"]).toEqual([]);

    // Done editing
    s = wizardReducer(s, { type: "MODIFY_DONE" });
    expect(s.step).toBe("review");

    // Confirm
    s = wizardReducer(s, { type: "CONFIRM_SAVE" });
    expect(s.step).toBe("saved");
    expect(s.confirmedAt).toBeTruthy();
  });

  it("modify reset-all: clears and restarts from gcal", () => {
    let s = createInitialState();

    s = wizardReducer(s, {
      type: "LOAD_MEETING_OK",
      meetingTitle: "Rapat",
      dates: DATES,
      startHour: 8,
      endHour: 17,
    });

    s = wizardReducer(s, {
      type: "START_MODIFY",
      displayName: "User",
      participantId: "p1",
      availability: {
        "2026-06-15": ["08:00"],
        "2026-06-16": ["09:00"],
        "2026-06-17": [],
      },
    });

    // Reset all
    s = wizardReducer(s, { type: "MODIFY_RESET_ALL" });
    expect(s.step).toBe("gcal");
    expect(s.availability).toEqual({});

    // Now go through full wizard again
    s = wizardReducer(s, { type: "SKIP_GCAL" });
    expect(s.step).toBe("select-time");
    expect(s.activeDateIndex).toBe(0);

    // All dates are pending since we cleared
    expect(s.availability["2026-06-15"]).toBeUndefined();
  });

  it("Jendela Tampilan: filters display to current admin range without deleting data", () => {
    // Admin changes dates from [Jun 15, 16, 17] to [Jun 15, 16, 18]
    // Jun 17 data preserved but hidden; Jun 18 shown as pending
    const newDates = ["2026-06-15", "2026-06-16", "2026-06-18"];

    const availability = {
      "2026-06-15": ["08:00"],
      "2026-06-16": [],
      "2026-06-17": ["10:00", "10:30"], // removed from admin range
    };

    // getReviewItems only shows dates in the current dates array
    const items = getReviewItems(availability, newDates);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ date: "2026-06-15", status: "filled" });
    expect(items[1]).toMatchObject({ date: "2026-06-16", status: "skipped" });
    expect(items[2]).toMatchObject({ date: "2026-06-18", status: "pending" });

    // Jun 17 data is preserved in availability but not shown in review
    expect(availability["2026-06-17"]).toEqual(["10:00", "10:30"]);
  });
});
