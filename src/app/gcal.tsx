"use client";

import { useState, useCallback } from "react";
import { getConflictsByDate, type GCalEvent } from "@/lib/time-selector";
import { formatDateLong } from "@/lib/date-utils";

interface GCalButtonProps {
  dates: string[];
  startHour: number;
  endHour: number;
  onConflictsChange: (conflictsByDate: Record<string, string[]>) => void;
  onEventsFetched?: (events: GCalEvent[]) => void;
  initialConnected?: boolean;
}

interface GCalConflictPanelProps {
  events: GCalEvent[];
  dates: string[];
  onConfirm: (selectedEvents: GCalEvent[]) => void;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const CHECKMARK_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
  </svg>
);

function parseGCalInstant(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(iso + "T00:00:00");
  }
  return new Date(iso);
}

function eventOverlapsDates(event: GCalEvent, dates: string[]): boolean {
  const eventStart = parseGCalInstant(event.start);
  const eventEnd = parseGCalInstant(event.end);
  if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return false;

  return dates.some((date) => {
    const dateStart = new Date(date + "T00:00:00");
    const dateEnd = new Date(date + "T23:59:59");
    return !(eventEnd <= dateStart || eventStart >= dateEnd);
  });
}

export function GCalButton({
  dates,
  startHour,
  endHour,
  onConflictsChange,
  onEventsFetched,
  initialConnected,
}: GCalButtonProps) {
  const [connected, setConnected] = useState(initialConnected ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (accessToken: string) => {
      if (!window.gapi?.client?.calendar) return;

      window.gapi.client.setToken({ access_token: accessToken });

      const allEvents: GCalEvent[] = [];

      for (const date of dates) {
        const dayStart = new Date(date + "T00:00:00");
        const dayEnd = new Date(date + "T23:59:59");

        try {
          const resp = await window.gapi.client.calendar.events.list({
            calendarId: "primary",
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
          });

          for (const item of resp.result.items ?? []) {
            allEvents.push({
              start: item.start?.dateTime ?? item.start?.date ?? "",
              end: item.end?.dateTime ?? item.end?.date ?? "",
              summary: item.summary,
            });
          }
        } catch {
        }
      }

      if (onEventsFetched) {
        onEventsFetched(allEvents);
        setConnected(true);
        setLoading(false);
        return;
      }

      onConflictsChange(getConflictsByDate(allEvents, dates, startHour, endHour));
      setConnected(true);
      setLoading(false);
    },
    [dates, startHour, endHour, onConflictsChange, onEventsFetched],
  );

  const handleConnect = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!CLIENT_ID || !API_KEY) {
      setError("Google Calendar belum dikonfigurasi.");
      return;
    }

    if (!window.gapi || !window.google?.accounts?.oauth2) {
      setError(
        "Google Calendar belum tersedia. Tunggu beberapa saat dan coba lagi.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    window.gapi.load("client", async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
        });

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp: TokenResponse) => {
            if (resp.error) {
              setError("Gagal menghubungkan Google Calendar.");
              setLoading(false);
              return;
            }
            await fetchEvents(resp.access_token);
            setConnected(true);
            setLoading(false);
          },
        });

        tokenClient.requestAccessToken();
      } catch {
        setError("Gagal menginisialisasi Google API.");
        setLoading(false);
      }
    });
  }, [fetchEvents, onEventsFetched]);

  const handleDisconnect = useCallback(() => {
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: "" });
    }
    onConflictsChange({});
    setConnected(false);
    setError(null);
  }, [onConflictsChange]);

  if (!CLIENT_ID) {
    return (
      <div className="ts-gcal-row">
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Google Calendar tidak tersedia (konfigurasi diperlukan)
        </span>
      </div>
    );
  }

  return (
    <div className="ts-gcal-row">
      {!connected ? (
        <button
          className="btn btn-ghost ts-gcal-btn"
          onClick={handleConnect}
          disabled={loading}
        >
          {CHECKMARK_SVG}
          {loading ? "Menghubungkan..." : "Hubungkan Google Calendar"}
        </button>
      ) : (
        <>
          <span className="ts-gcal-connected">
            {CHECKMARK_SVG}
            Google Calendar terhubung
          </span>
          <button
            className="btn btn-r ts-gcal-disconnect-btn"
            onClick={handleDisconnect}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            Putuskan
          </button>
        </>
      )}
      {error && (
        <span style={{ fontSize: 11, color: "var(--red)" }}>{error}</span>
      )}
    </div>
  );
}

export function GCalConflictPanel({
  events,
  dates,
  onConfirm,
}: GCalConflictPanelProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const overlappingEvents = events.filter((e) => eventOverlapsDates(e, dates));

  const toggle = (idx: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = overlappingEvents.filter((_, i) => checked.has(i));
    onConfirm(selected);
  };

  if (overlappingEvents.length === 0) {
    return (
      <div className="wizard-wrap wizard-step" style={{ padding: "28px 24px" }}>
        <div className="card" style={{ maxWidth: 440, padding: "32px" }}>
          <div className="card-badge">Langkah 2 — Kalender</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              marginBottom: 8,
              color: "var(--text)",
            }}
          >
            Google Calendar terhubung
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
            Tidak ada acara yang bentrok dengan tanggal pertemuan.
          </p>
          <button
            className="btn btn-p"
            onClick={handleConfirm}
            style={{ width: "100%" }}
          >
            Lanjutkan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-wrap wizard-step" style={{ padding: "28px 24px" }}>
      <div className="card" style={{ maxWidth: 440, padding: "32px" }}>
        <div className="card-badge">Langkah 2 — Kalender</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            marginBottom: 8,
            color: "var(--text)",
          }}
        >
          Google Calendar terhubung
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
          Kamu tidak bisa ikut pertemuan pada acara yang mana?
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {overlappingEvents.map((event, idx) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const dateStr = formatDateLong(
              eventStart.toISOString().slice(0, 10),
            );
            const startTime = eventStart.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endTime = eventEnd.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <label
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: checked.has(idx)
                    ? "var(--green-pale)"
                    : "#fafafa",
                  cursor: "pointer",
                  transition: "background 200ms ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked.has(idx)}
                  onChange={() => toggle(idx)}
                  style={{ marginTop: 2, accentColor: "var(--green)" }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                    {event.summary || "(Tanpa judul)"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      fontFamily: "var(--font-mono)",
                      marginTop: 2,
                    }}
                  >
                    {dateStr} · {startTime}–{endTime}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <button
          className="btn btn-p"
          onClick={handleConfirm}
          style={{ width: "100%" }}
        >
          Simpan
        </button>
      </div>
    </div>
  );
}
