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

  it("calls onEventsFetched with raw events after successful auth", async () => {
    const onConflictsChange = vi.fn();
    const onEventsFetched = vi.fn();
    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={onConflictsChange}
        onEventsFetched={onEventsFetched}
      />,
    );

    const btn = container.querySelector(".ts-gcal-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(onEventsFetched).toHaveBeenCalled();
    const events = onEventsFetched.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Test Event");
    expect(onConflictsChange).not.toHaveBeenCalled();
  });

  it("starts in connected state when initialConnected is true", async () => {
    const { GCalButton } = await import("@/app/gcal");
    const { container } = render(
      <GCalButton
        dates={["2026-06-15"]}
        startHour={8}
        endHour={17}
        onConflictsChange={vi.fn()}
        initialConnected={true}
      />,
    );

    expect(container.textContent).toContain("Google Calendar terhubung");
    expect(container.textContent).toContain("Putuskan");
  });
});

describe("GCalConflictPanel", () => {
  const DATES = ["2026-06-15", "2026-06-16"];

  beforeEach(() => {
    vi.resetModules();
  });

  it("shows events with checkboxes default OFF", async () => {
    const { GCalConflictPanel } = await import("@/app/gcal");
    const onConfirm = vi.fn();

    const events = [
      { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "Rapat Pagi" },
      { start: "2026-06-15T14:00:00", end: "2026-06-15T15:00:00", summary: "Dentist" },
    ];

    const { container } = render(
      <GCalConflictPanel
        events={events}
        dates={DATES}
        onConfirm={onConfirm}
      />,
    );

    expect(container.textContent).toContain("Kamu tidak bisa ikut pertemuan pada acara yang mana?");
    expect(container.textContent).toContain("Rapat Pagi");
    expect(container.textContent).toContain("Dentist");

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((cb) => expect(cb.checked).toBe(false));
  });

  it("calls onConfirm with only checked events", async () => {
    const { GCalConflictPanel } = await import("@/app/gcal");
    const onConfirm = vi.fn();

    const events = [
      { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "Rapat Pagi" },
      { start: "2026-06-15T14:00:00", end: "2026-06-15T15:00:00", summary: "Dentist" },
    ];

    const { container } = render(
      <GCalConflictPanel
        events={events}
        dates={DATES}
        onConfirm={onConfirm}
      />,
    );

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    await act(async () => {
      fireEvent.click(checkboxes[0]); // Check first one
    });

    const btn = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(onConfirm).toHaveBeenCalledWith([events[0]]);
  });

  it("shows empty state when no events", async () => {
    const { GCalConflictPanel } = await import("@/app/gcal");
    const onConfirm = vi.fn();

    const { container } = render(
      <GCalConflictPanel
        events={[]}
        dates={DATES}
        onConfirm={onConfirm}
      />,
    );

    expect(container.textContent).toContain("Tidak ada acara yang bentrok");

    const btn = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(onConfirm).toHaveBeenCalledWith([]);
  });

  it("filters out events that do not overlap with meeting dates", async () => {
    const { GCalConflictPanel } = await import("@/app/gcal");
    const onConfirm = vi.fn();

    const events = [
      { start: "2026-06-15T09:00:00", end: "2026-06-15T10:00:00", summary: "On Date" },
      { start: "2026-06-20T09:00:00", end: "2026-06-20T10:00:00", summary: "Off Date" },
    ];

    const { container } = render(
      <GCalConflictPanel
        events={events}
        dates={DATES}
        onConfirm={onConfirm}
      />,
    );

    expect(container.textContent).toContain("On Date");
    expect(container.textContent).not.toContain("Off Date");
  });
});
