import { describe, it, expect } from "vitest";
import { parseOS, parseBrowser } from "@/lib/ua-parser";

describe("parseOS", () => {
  it("detects Windows", () => {
    expect(parseOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows");
  });

  it("detects macOS", () => {
    expect(
      parseOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
    ).toBe("macOS");
  });

  it("detects Linux", () => {
    expect(parseOS("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux");
  });

  it("detects Android", () => {
    expect(
      parseOS("Mozilla/5.0 (Linux; Android 13; Pixel 7)"),
    ).toBe("Android");
  });

  it("detects iOS (iPhone)", () => {
    expect(
      parseOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"),
    ).toBe("iOS");
  });

  it("detects iOS (iPad)", () => {
    expect(
      parseOS("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"),
    ).toBe("iOS");
  });

  it('returns "Unknown" for empty string', () => {
    expect(parseOS("")).toBe("Unknown");
  });
});

describe("parseBrowser", () => {
  it("detects Chrome", () => {
    expect(
      parseBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome");
  });

  it("detects Firefox", () => {
    expect(
      parseBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      ),
    ).toBe("Firefox");
  });

  it("detects Edge", () => {
    expect(
      parseBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
    ).toBe("Edge");
  });

  it("detects Safari (no Chrome/Edge token)", () => {
    expect(
      parseBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
    ).toBe("Safari");
  });

  it("detects Opera", () => {
    expect(
      parseBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
      ),
    ).toBe("Opera");
  });

  it('returns "Unknown" for empty string', () => {
    expect(parseBrowser("")).toBe("Unknown");
  });
});
