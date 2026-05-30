import { describe, it, expect } from "vitest";
import { hashPassword } from "@/lib/hash";

describe("hashPassword", () => {
  it("returns a 64-char hex string", async () => {
    const result = await hashPassword("test123");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", async () => {
    const a = await hashPassword("hello");
    const b = await hashPassword("hello");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await hashPassword("abc");
    const b = await hashPassword("xyz");
    expect(a).not.toBe(b);
  });

  it("matches known SHA-256 vector", async () => {
    const result = await hashPassword("root123");
    expect(result).toBe(
      "e14cb9e5c0eeee0ea313a4e04fbd10aa17ac17aa33a3cad4bdfe74b87ca18ef8",
    );
  });
});
