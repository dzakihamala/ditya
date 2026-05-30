"use client";

import type { ReviewItem } from "@/lib/wizard";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface ReviewProps {
  items: ReviewItem[];
  displayName: string;
  onEdit: (date: string) => void;
  onSave: () => void;
  saving: boolean;
  error?: string | null;
}

export function Review({ items, displayName, onEdit, onSave, saving, error }: ReviewProps) {
  const filledCount = items.filter((i) => i.status === "filled" || i.status === "skipped").length;
  const totalDates = items.length;

  return (
    <div className="wizard-wrap" style={{ padding: "28px 24px" }}>
      <div className="card" style={{ maxWidth: 520, padding: "32px" }}>
        <div className="card-badge">Langkah 3 — Review</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            marginBottom: 2,
            color: "var(--text)",
          }}
        >
          Ringkasan Ketersediaan
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          {displayName} · {filledCount}/{totalDates} tanggal terisi
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {items.map((item) => (
            <div
              key={item.date}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background:
                  item.status === "filled"
                    ? "var(--green-pale)"
                    : item.status === "skipped"
                      ? "#fff7e6"
                      : "#fafafa",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text)",
                    marginBottom: 2,
                  }}
                >
                  {formatDate(item.date)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                    color:
                      item.status === "filled"
                        ? "var(--green)"
                        : item.status === "skipped"
                          ? "#d97706"
                          : "var(--muted)",
                  }}
                >
                  {item.status === "filled" && item.ranges.length > 0
                    ? item.ranges.map((r) => `${r.start}–${r.end}`).join(", ")
                    : item.status === "skipped"
                      ? "Tidak bisa"
                      : "Belum diisi"}
                </div>
              </div>
              <button
                className="btn btn-o"
                onClick={() => onEdit(item.date)}
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                Ubah
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div
            className="err-box"
            style={{ marginBottom: 12, textAlign: "center" }}
          >
            {error}
          </div>
        )}

        <button
          className="btn btn-p"
          onClick={onSave}
          disabled={saving}
          style={{ width: "100%" }}
        >
          {saving ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />
              Menyimpan...
            </>
          ) : (
            "Simpan"
          )}
        </button>
      </div>
    </div>
  );
}
