import { parseOS, parseBrowser } from "./ua-parser";

export function normalizeName(name: string): string {
  return name.trim().toUpperCase();
}

export function getDeviceInfo() {
  if (typeof navigator === "undefined") {
    return { os: "Unknown", browser: "Unknown" };
  }
  const ua = navigator.userAgent;
  return {
    os: parseOS(ua),
    browser: parseBrowser(ua),
  };
}
