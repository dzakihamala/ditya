import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";

// Mock getConflictingSlots to return predictable conflicts
vi.mock("@/lib/time-selector", async () => {
  const actual = await vi.importActual<typeof import("@/lib/time-selector")>(
    "@/lib/time-selector",
  );
  return {
    ...actual,
    getConflictingSlots: vi.fn(() => ["09:00", "09:30"]),
  };
});

describe("GCalButton — env vars not configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows configuration needed message when CLIENT_ID is empty", async () => {
    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={vi.fn()}
      />,
    );

    expect(container.textContent).toContain(
      "Google Calendar tidak tersedia (konfigurasi diperlukan)",
    );
  });
});

describe("GCalButton — connect and disconnect flow", () => {
  beforeEach(() => {
    vi.resetModules();
    // Re-apply mock after reset
    vi.doMock("@/lib/time-selector", async () => {
      const actual = await vi.importActual<typeof import("@/lib/time-selector")>(
        "@/lib/time-selector",
      );
      return {
        ...actual,
        getConflictingSlots: vi.fn(() => ["09:00", "09:30"]),
      };
    });

    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_API_KEY", "test-api-key");

    // Mock window.gapi
    Object.defineProperty(window, "gapi", {
      value: {
        load: vi.fn((_api: string, cb: () => void) => {
          cb();
        }),
        client: {
          init: vi.fn(() => Promise.resolve()),
          calendar: {
            events: {
              list: vi.fn(() =>
                Promise.resolve({
                  result: {
                    items: [
                      {
                        start: { dateTime: "2026-06-15T09:00:00" },
                        end: { dateTime: "2026-06-15T10:00:00" },
                        summary: "Test Event",
                      },
                    ],
                  },
                }),
              ),
            },
          },
          setToken: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock window.google
    Object.defineProperty(window, "google", {
      value: {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn(
              (config: {
                callback: (resp: { access_token?: string; error?: string }) => void;
              }) => ({
                requestAccessToken: vi.fn(() => {
                  config.callback({ access_token: "test-token" });
                }),
              }),
            ),
          },
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders connect button when env vars are present", async () => {
    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={vi.fn()}
      />,
    );

    expect(container.textContent).toContain("Hubungkan Google Calendar");
  });

  it("shows connected state and disconnect button after successful auth", async () => {
    const onConflictsChange = vi.fn();
    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={onConflictsChange}
      />,
    );

    const btn = container.querySelector(".ts-gcal-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    // After successful auth, should show connected state and disconnect btn
    expect(container.textContent).toContain("Google Calendar terhubung");
    expect(container.textContent).toContain("Putuskan");
    expect(onConflictsChange).toHaveBeenCalledWith(["09:00", "09:30"]);
  });

  it("disconnect clears conflicts and shows connect button again", async () => {
    const onConflictsChange = vi.fn();
    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={onConflictsChange}
      />,
    );

    // Connect first
    const connectBtn = container.querySelector(".ts-gcal-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(connectBtn);
    });

    expect(container.textContent).toContain("Google Calendar terhubung");

    // Disconnect
    const disconnectBtn = container.querySelector(
      ".ts-gcal-disconnect-btn",
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(disconnectBtn);
    });

    // Should show connect button again
    expect(container.textContent).toContain("Hubungkan Google Calendar");
    expect(onConflictsChange).toHaveBeenLastCalledWith([]);
  });

  it("shows error when gapi is not available", async () => {
    // Remove gapi from window
    delete (window as unknown as Record<string, unknown>).gapi;

    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={vi.fn()}
      />,
    );

    const btn = container.querySelector(".ts-gcal-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(container.textContent).toContain("Google Calendar belum tersedia");
  });

  it("shows error when OAuth fails", async () => {
    // Override google mock to simulate OAuth error
    Object.defineProperty(window, "google", {
      value: {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn(
              (config: {
                callback: (resp: { access_token?: string; error?: string }) => void;
              }) => ({
                requestAccessToken: vi.fn(() => {
                  config.callback({ error: "access_denied" });
                }),
              }),
            ),
          },
        },
      },
      writable: true,
      configurable: true,
    });

    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={vi.fn()}
      />,
    );

    const btn = container.querySelector(".ts-gcal-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(container.textContent).toContain(
      "Gagal menghubungkan Google Calendar",
    );
  });
});
