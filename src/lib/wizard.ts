import { slotsToRanges, type GCalEvent } from "./time-selector";

export type WizardStep =
  | "loading"
  | "input"
  | "gcal"
  | "gcal-conflicts"
  | "select-time"
  | "modify"
  | "review"
  | "saved";

export interface WizardState {
  step: WizardStep;
  displayName: string;
  participantId: string | null;
  availability: Record<string, string[]>;
  activeDateIndex: number;
  dates: string[];
  startHour: number;
  endHour: number;
  error: string | null;
  gcalConnected: boolean;
  gcalEvents: GCalEvent[];
  conflictSlots: string[];
  confirmedAt: string | null;
  meetingTitle: string;
  isModifyMode: boolean;
}

export type WizardAction =
  | { type: "LOAD_MEETING_OK"; meetingTitle: string; dates: string[]; startHour: number; endHour: number }
  | { type: "LOAD_MEETING_FAIL"; error: string }
  | { type: "NAME_CONFIRMED"; displayName: string; participantId: string; availability?: Record<string, string[]> }
  | { type: "SKIP_GCAL" }
  | { type: "GCAL_CONNECTED" }
  | { type: "GCAL_EVENTS_LOADED"; events: GCalEvent[] }
  | { type: "GCAL_CONFLICTS_CONFIRMED"; conflictSlots: string[]; selectedEvents: GCalEvent[] }
  | { type: "SET_DATE_INDEX"; index: number }
  | { type: "UPDATE_SLOTS"; date: string; slots: string[] }
  | { type: "GO_TO_REVIEW" }
  | { type: "GO_TO_EDIT"; date: string }
  | { type: "START_MODIFY"; displayName: string; participantId: string; availability: Record<string, string[]> }
  | { type: "MODIFY_RESET_ALL" }
  | { type: "MODIFY_SINGLE_DATE"; date: string }
  | { type: "MODIFY_DONE" }
  | { type: "CONFIRM_SAVE" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

export function createInitialState(): WizardState {
  return {
    step: "loading",
    displayName: "",
    participantId: null,
    availability: {},
    activeDateIndex: 0,
    dates: [],
    startHour: 8,
    endHour: 17,
    error: null,
    gcalConnected: false,
    gcalEvents: [],
    conflictSlots: [],
    confirmedAt: null,
    meetingTitle: "",
    isModifyMode: false,
  };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "LOAD_MEETING_OK":
      return {
        ...state,
        step: "input",
        meetingTitle: action.meetingTitle,
        dates: action.dates,
        startHour: action.startHour,
        endHour: action.endHour,
        error: null,
      };

    case "LOAD_MEETING_FAIL":
      return {
        ...state,
        step: "loading",
        error: action.error,
      };

    case "NAME_CONFIRMED":
      return {
        ...state,
        step: "gcal",
        displayName: action.displayName,
        participantId: action.participantId,
        availability: action.availability ?? {},
        activeDateIndex: findFirstPendingIndex(state.dates, action.availability ?? {}),
        error: null,
      };

    case "SKIP_GCAL":
      return {
        ...state,
        step: "select-time",
        gcalConnected: false,
      };

    case "GCAL_CONNECTED":
      return {
        ...state,
        step: "gcal-conflicts",
        gcalConnected: true,
        gcalEvents: [],
      };

    case "GCAL_EVENTS_LOADED":
      return {
        ...state,
        step: "gcal-conflicts",
        gcalConnected: true,
        gcalEvents: action.events,
      };

    case "GCAL_CONFLICTS_CONFIRMED":
      return {
        ...state,
        step: "select-time",
        gcalConnected: true,
        conflictSlots: action.conflictSlots,
      };

    case "SET_DATE_INDEX": {
      if (action.index < 0 || action.index >= state.dates.length) return state;
      return {
        ...state,
        activeDateIndex: action.index,
      };
    }

    case "UPDATE_SLOTS": {
      const availability = { ...state.availability, [action.date]: action.slots };
      return { ...state, availability, error: null };
    }

    case "GO_TO_REVIEW":
      return { ...state, step: "review" };

    case "GO_TO_EDIT": {
      const idx = state.dates.indexOf(action.date);
      if (idx < 0) return state;
      return {
        ...state,
        step: "select-time",
        activeDateIndex: idx,
      };
    }

    case "START_MODIFY":
      return {
        ...state,
        step: "modify",
        displayName: action.displayName,
        participantId: action.participantId,
        availability: action.availability,
        activeDateIndex: 0,
        error: null,
        isModifyMode: true,
      };

    case "MODIFY_RESET_ALL":
      return {
        ...state,
        step: "gcal",
        availability: {},
        activeDateIndex: 0,
        isModifyMode: false,
      };

    case "MODIFY_SINGLE_DATE": {
      const idx = state.dates.indexOf(action.date);
      if (idx < 0) return state;
      return {
        ...state,
        step: "select-time",
        activeDateIndex: idx,
      };
    }

    case "MODIFY_DONE":
      return { ...state, step: "review" };

    case "CONFIRM_SAVE":
      return {
        ...state,
        step: "saved",
        confirmedAt: new Date().toISOString(),
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

export interface ReviewItem {
  date: string;
  status: "filled" | "skipped" | "pending";
  ranges: { start: string; end: string }[];
}

export function getReviewItems(
  availability: Record<string, string[]>,
  dates: string[],
): ReviewItem[] {
  return dates.map((date) => {
    const slots = availability[date];
    if (!slots) return { date, status: "pending", ranges: [] };
    if (slots.length === 0) return { date, status: "skipped", ranges: [] };
    return { date, status: "filled", ranges: slotsToRanges(slots) };
  });
}

export function isDateCompleted(availability: Record<string, string[]>, date: string): boolean {
  return date in availability;
}

export function getCompletedCount(availability: Record<string, string[]>, dates: string[]): number {
  return dates.filter((d) => isDateCompleted(availability, d)).length;
}

export function isAllDatesCompleted(availability: Record<string, string[]>, dates: string[]): boolean {
  return dates.length > 0 && dates.every((d) => isDateCompleted(availability, d));
}

function findFirstPendingIndex(dates: string[], availability: Record<string, string[]>): number {
  const idx = dates.findIndex((d) => !isDateCompleted(availability, d));
  return idx >= 0 ? idx : 0;
}
