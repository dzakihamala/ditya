import { describe, it, expect, vi } from "vitest";

// Mock Firebase before importing the component
vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

import { render, fireEvent } from "@testing-library/react";
import { Recommendations } from "@/app/admin/meetings/[id]/analysis/recommendations";
import type { ContiguousBlock } from "@/lib/analysis";

function makeBlock(overrides: Partial<ContiguousBlock> = {}): ContiguousBlock {
  return {
    date: "2026-06-15",
    start: "08:00",
    end: "09:30",
    participantCount: 3,
    totalParticipants: 5,
    durationMinutes: 90,
    participantNames: ["Alice", "Bob", "Charlie"],
    missingNames: ["Dave", "Eve"],
    ...overrides,
  };
}

describe("Recommendations", () => {
  it("renders recommendation blocks", () => {
    const blocks = [makeBlock(), makeBlock({ date: "2026-06-16" })];
    const { container } = render(<Recommendations blocks={blocks} />);
    const recs = container.querySelectorAll(".analysis-rec");
    expect(recs).toHaveLength(2);
  });

  it("shows empty message when no blocks", () => {
    const { container } = render(<Recommendations blocks={[]} />);
    expect(container.textContent).toContain(
      "Belum cukup data untuk memberikan rekomendasi.",
    );
  });

  it("body is always present in DOM (not conditionally rendered)", () => {
    const blocks = [makeBlock()];
    const { container } = render(<Recommendations blocks={blocks} />);
    const bodies = container.querySelectorAll(".analysis-rec-body");
    expect(bodies).toHaveLength(1);
  });

  it("body gets expanded class on header click, chevron rotates", () => {
    const blocks = [makeBlock()];
    const { container } = render(<Recommendations blocks={blocks} />);

    const header = container.querySelector(".analysis-rec-header") as HTMLElement;
    const body = container.querySelector(".analysis-rec-body") as HTMLElement;
    const chevron = container.querySelector(
      ".analysis-rec-chevron",
    ) as HTMLElement;

    // Initially collapsed
    expect(body.classList.contains("expanded")).toBe(false);
    expect(chevron.classList.contains("expanded")).toBe(false);

    // Click to expand
    fireEvent.click(header);
    expect(body.classList.contains("expanded")).toBe(true);
    expect(chevron.classList.contains("expanded")).toBe(true);

    // Click again to collapse
    fireEvent.click(header);
    expect(body.classList.contains("expanded")).toBe(false);
    expect(chevron.classList.contains("expanded")).toBe(false);
  });

  it("renders attendee tags in body", () => {
    const blocks = [makeBlock()];
    const { container } = render(<Recommendations blocks={blocks} />);

    const header = container.querySelector(".analysis-rec-header") as HTMLElement;
    fireEvent.click(header);

    const bisaTags = container.querySelectorAll(".analysis-rec-tag.bisa");
    expect(bisaTags).toHaveLength(3);
    expect(bisaTags[0].textContent).toBe("Alice");
    expect(bisaTags[1].textContent).toBe("Bob");
    expect(bisaTags[2].textContent).toBe("Charlie");

    const tidakTags = container.querySelectorAll(".analysis-rec-tag.tidak");
    expect(tidakTags).toHaveLength(2);
    expect(tidakTags[0].textContent).toBe("Dave");
    expect(tidakTags[1].textContent).toBe("Eve");
  });
});
