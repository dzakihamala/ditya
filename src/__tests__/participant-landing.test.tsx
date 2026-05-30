import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("@/app/time-selector", () => ({
  TimeSelector: () => <div data-testid="time-selector">Time Selector</div>,
}));

vi.mock("@/app/review", () => ({
  Review: () => <div data-testid="review">Review</div>,
}));

vi.mock("@/app/date-chips", () => ({
  DateChips: () => <div data-testid="date-chips">Date Chips</div>,
}));

vi.mock("@/app/gcal", () => ({
  GCalButton: () => <button type="button">GCal</button>,
  GCalConflictPanel: () => <div>GCal Conflicts</div>,
}));

import { ParticipantLanding } from "@/app/participant-landing";

describe("ParticipantLanding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        eventName: "Rapat Mingguan Tim",
        dates: ["2026-06-15", "2026-06-16"],
        startHour: 8,
        endHour: 17,
      }),
    });

    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: "new-participant-id" });
  });

  it("shows the name form after the meeting loads", async () => {
    render(<ParticipantLanding meetingId="meeting-1" />);

    expect(await screen.findByPlaceholderText(/ketik nama lengkap/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /lanjutkan/i })).toBeDefined();
    expect(screen.getByText("Rapat Mingguan Tim")).toBeDefined();
  });

  it("advances to time selection after submitting a new name", async () => {
    render(<ParticipantLanding meetingId="meeting-1" />);

    const input = await screen.findByPlaceholderText(/ketik nama lengkap/i);
    fireEvent.change(input, { target: { value: "Ditya" } });
    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    expect(await screen.findByTestId("time-selector")).toBeDefined();
    expect(screen.queryByText(/langkah 1 — nama/i)).toBeNull();
  });

});
