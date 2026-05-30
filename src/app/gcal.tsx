"use client";

import { useState, useCallback } from "react";
import { getConflictingSlots, type GCalEvent } from "@/lib/time-selector";

interface GCalButtonProps {
  dates: string[];
  startHour: number;
  endHour: number;
  onConflictsChange: (conflicts: string[]) => void;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const CHECKMARK_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
  </svg>
);

export function GCalButton({
  dates,
  startHour,
  endHour,
  onConflictsChange,
}: GCalButtonProps) {
  const [connected, setConnected] = useState(false);
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

      const allConflicts = new Set<string>();
      for (const date of dates) {
        for (const slot of getConflictingSlots(
          allEvents,
          date,
          startHour,
          endHour,
        )) {
          allConflicts.add(slot);
        }
      }

      onConflictsChange(Array.from(allConflicts).sort());
    },
    [dates, startHour, endHour, onConflictsChange],
  );

  const handleConnect = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!CLIENT_ID || !API_KEY) {
      setError("Google Calendar belum dikonfigurasi.");
      return;
    }

    if (!window.gapi) {
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
  }, [fetchEvents]);

  const handleDisconnect = useCallback(() => {
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: "" });
    }
    onConflictsChange([]);
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
