import { describe, it, expect } from "vitest";
import { normalizeName } from "@/lib/participant";

describe("normalizeName", () => {
  it("trims whitespace", () => {
    expect(normalizeName("  Alice  ")).toBe("ALICE");
  });

  it("uppercases the name", () => {
    expect(normalizeName("Alice")).toBe("ALICE");
  });

  it("handles mixed case with whitespace", () => {
    expect(normalizeName("  aLiCe  ")).toBe("ALICE");
  });

  it("handles empty string", () => {
    expect(normalizeName("")).toBe("");
  });

  it("is case-insensitive for matching", () => {
    const a = normalizeName("John Doe");
    const b = normalizeName("JOHN DOE");
    const c = normalizeName("john doe");
    const d = normalizeName("  John Doe  ");
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toBe(d);
  });

  it("preserves internal spaces", () => {
    expect(normalizeName("John  Doe")).toBe("JOHN  DOE");
  });
});

describe("duplicate detection query logic", () => {
  it("normalizes names to the same key regardless of input casing", () => {
    // Simulating what the Firestore query does:
    // where("name", "==", input.toUpperCase().trim())
    const stored = "ALICE";
    const input1 = normalizeName("Alice");
    const input2 = normalizeName("ALICE");
    const input3 = normalizeName("  alice  ");

    expect(input1).toBe(stored);
    expect(input2).toBe(stored);
    expect(input3).toBe(stored);
  });

  it("distinguishes different names", () => {
    expect(normalizeName("Alice")).not.toBe(normalizeName("Bob"));
  });

  it("handles Indonesian names", () => {
    expect(normalizeName("Dzaki Hamala Firdaus")).toBe(
      "DZAKI HAMALA FIRDAUS",
    );
  });

  it("handles single-letter name edge case", () => {
    expect(normalizeName("A")).toBe("A");
  });
});
