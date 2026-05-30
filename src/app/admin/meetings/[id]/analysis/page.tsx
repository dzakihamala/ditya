"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/lib/AuthGuard";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { generateSlots } from "@/lib/time-selector";
import { floatToTimeStr, formatDateLong, formatDateShort } from "@/lib/date-utils";
import {
  computeMetrics,
  computeHeatmap,
  findAllBlocks,
  rankRecommendations,
  classifyParticipants,
  formatCopySummary,
} from "@/lib/analysis";
import type { Meeting } from "@/lib/types";
import type { ParticipantData, ContiguousBlock, HeatmapCell, ParticipantSummary } from "@/lib/analysis";

const GREEN_R = 107;
const GREEN_G = 143;
const GREEN_B = 94;

function intensityToGreen(intensity: number): string {
  if (intensity <= 0) return "transparent";
  return `rgba(${GREEN_R}, ${GREEN_G}, ${GREEN_B}, ${intensity})`;
}

function intensityToBg(intensity: number): string {
  if (intensity <= 0) return "var(--bg)";
  const alpha = 0.12 + intensity * 0.88;
  return `rgba(${GREEN_R}, ${GREEN_G}, ${GREEN_B}, ${alpha})`;
}

/* ------------------------------------------------------------------ */
/*  Metrics Bar                                                        */
/* ------------------------------------------------------------------ */

function MetricsBar({
  totalParticipants,
  filledSlots,
  activeDays,
}: {
  totalParticipants: number;
  filledSlots: number;
  activeDays: number;
}) {
  return (
    <div className="analysis-metrics">
      <div className="analysis-metric-card">
        <span className="analysis-metric-num">{totalParticipants}</span>
        <span className="analysis-metric-label">Total Partisipan</span>
      </div>
      <div className="analysis-metric-card">
        <span className="analysis-metric-num">{filledSlots}</span>
        <span className="analysis-metric-label">Slot Terisi</span>
      </div>
      <div className="analysis-metric-card">
        <span className="analysis-metric-num">{activeDays}</span>
        <span className="analysis-metric-label">Hari Aktif</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Heatmap                                                            */
/* ------------------------------------------------------------------ */

function Heatmap({
  heatmap,
  dates,
  slots,
  participants,
}: {
  heatmap: HeatmapCell[][];
  dates: string[];
  slots: string[];
  participants: ParticipantData[];
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    cell: HeatmapCell;
  } | null>(null);
  const [mobileDate, setMobileDate] = useState(dates[0] || "");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback(
    (e: React.MouseEvent, cell: HeatmapCell) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setTooltip({ x: e.clientX, y: e.clientY, cell });
    },
    [],
  );

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setTooltip(null), 150);
  }, []);

  // Desktop grid: slots rows × dates columns
  const desktopGrid = (
    <div className="analysis-heatmap-grid">
      <div className="analysis-heatmap-header">
        <div className="analysis-heatmap-corner" />
        {dates.map((date) => (
          <div key={date} className="analysis-heatmap-date-header">
            {formatDateShort(date)}
          </div>
        ))}
      </div>
      {slots.map((slot, si) => (
        <div key={slot} className="analysis-heatmap-row">
          <div className="analysis-heatmap-slot-label">{slot}</div>
          {dates.map((date, di) => {
            const cell = heatmap[si][di];
            return (
              <div
                key={date}
                className="analysis-heatmap-cell"
                style={{ backgroundColor: intensityToBg(cell.intensity) }}
                onMouseEnter={(e) => showTooltip(e, cell)}
                onMouseMove={(e) =>
                  setTooltip((prev) =>
                    prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
                  )
                }
                onMouseLeave={scheduleHide}
              >
                <span
                  className="analysis-heatmap-cell-label"
                  style={{ opacity: cell.count > 0 ? 1 : 0.3 }}
                >
                  {cell.count > 0 ? cell.count : ""}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // Mobile: date tabs + bar chart for the active date
  const mobileDateIndex = dates.indexOf(mobileDate);
  const mobileSlots =
    mobileDateIndex >= 0
      ? slots.map((slot) => heatmap[slots.indexOf(slot)][mobileDateIndex])
      : [];

  const mobileView = (
    <div className="analysis-heatmap-mobile">
      <div className="analysis-heatmap-mobile-tabs">
        {dates.map((date) => (
          <button
            key={date}
            className={`analysis-heatmap-mobile-tab ${date === mobileDate ? "active" : ""}`}
            onClick={() => setMobileDate(date)}
          >
            {formatDateShort(date)}
          </button>
        ))}
      </div>
      <div className="analysis-heatmap-bar-chart">
        {mobileSlots.map((cell) => {
          const barHeight = cell.intensity * 100;
          return (
            <div
              key={cell.slot}
              className="analysis-heatmap-bar-row"
              onMouseEnter={(e) => showTooltip(e, cell)}
              onMouseMove={(e) =>
                setTooltip((prev) =>
                  prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
                )
              }
              onMouseLeave={scheduleHide}
            >
              <span className="analysis-heatmap-bar-label">{cell.slot}</span>
              <div className="analysis-heatmap-bar-track">
                <div
                  className="analysis-heatmap-bar-fill"
                  style={{
                    width: `${barHeight}%`,
                    backgroundColor: intensityToGreen(cell.intensity),
                  }}
                />
              </div>
              <span className="analysis-heatmap-bar-count">
                {cell.count > 0 ? `${cell.count}/${participants.length}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="analysis-heatmap">
      <h3 className="analysis-section-title">Heatmap Ketersediaan</h3>
      {tooltip && (
        <div
          className="analysis-tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="analysis-tooltip-header">
            {formatDateLong(tooltip.cell.date)} · {tooltip.cell.slot}
          </div>
          {tooltip.cell.participantNames.length > 0 ? (
            <div className="analysis-tooltip-names">
              {tooltip.cell.participantNames.join(", ")}
            </div>
          ) : (
            <div className="analysis-tooltip-empty">Tidak ada yang bisa</div>
          )}
          <div className="analysis-tooltip-count">
            {tooltip.cell.count}/{participants.length} peserta
          </div>
        </div>
      )}
      <div className="analysis-heatmap-legend">
        <span className="analysis-heatmap-legend-item">
          <span
            className="analysis-heatmap-legend-swatch"
            style={{
              background: `linear-gradient(to right, transparent, rgba(${GREEN_R},${GREEN_G},${GREEN_B},1))`,
            }}
          />
          0 → {participants.length} peserta
        </span>
      </div>
      {desktopGrid}
      {mobileView}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recommendations                                                    */
/* ------------------------------------------------------------------ */

export function Recommendations({ blocks }: { blocks: ContiguousBlock[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (blocks.length === 0) {
    return (
      <div className="analysis-section">
        <h3 className="analysis-section-title">Rekomendasi Jadwal</h3>
        <p className="analysis-empty-note">
          Belum cukup data untuk memberikan rekomendasi.
        </p>
      </div>
    );
  }

  return (
    <div className="analysis-section">
      <h3 className="analysis-section-title">Top {blocks.length} Rekomendasi Jadwal</h3>
      <div className="analysis-recs">
        {blocks.map((block, idx) => {
          const expanded = expandedIdx === idx;
          return (
            <div key={`${block.date}-${block.start}`} className="analysis-rec">
              <button
                className="analysis-rec-header"
                onClick={() => setExpandedIdx(expanded ? null : idx)}
              >
                <div className="analysis-rec-rank">#{idx + 1}</div>
                <div className="analysis-rec-info">
                  <div className="analysis-rec-date">
                    {formatDateLong(block.date)}
                  </div>
                  <div className="analysis-rec-range">
                    {block.start} – {block.end} · {block.durationMinutes} menit
                  </div>
                </div>
                <div className="analysis-rec-count">
                  <span className="analysis-rec-count-num">
                    {block.participantCount}/{block.totalParticipants}
                  </span>
                  <span className="analysis-rec-count-label">peserta</span>
                </div>
                <svg
                  className={`analysis-rec-chevron ${expanded ? "expanded" : ""}`}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className={`analysis-rec-body ${expanded ? "expanded" : ""}`}>
                <div className="analysis-rec-body-inner">
                  <div className="analysis-rec-attendees">
                    <h4 className="analysis-rec-subtitle">
                      Bisa hadir ({block.participantNames.length})
                    </h4>
                    <div className="analysis-rec-tags">
                      {block.participantNames.map((name) => (
                        <span key={name} className="analysis-rec-tag bisa">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {block.missingNames.length > 0 && (
                    <div className="analysis-rec-attendees">
                      <h4 className="analysis-rec-subtitle">
                        Tidak bisa / belum isi ({block.missingNames.length})
                      </h4>
                      <div className="analysis-rec-tags">
                        {block.missingNames.map((name) => (
                          <span key={name} className="analysis-rec-tag tidak">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Participant List                                                   */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<ParticipantSummary["status"], string> = {
  bisa: "Bisa",
  tidak_bisa: "Tidak Bisa",
  belum_isi: "Belum Isi",
};

function ParticipantList({ summaries }: { summaries: ParticipantSummary[] }) {
  return (
    <div className="analysis-section">
      <h3 className="analysis-section-title">
        Daftar Peserta ({summaries.length})
      </h3>
      <div className="analysis-participant-list">
        {summaries.map((p) => (
          <div key={p.id} className="analysis-participant-chip">
            <span className="analysis-participant-name">{p.displayName}</span>
            <span className="analysis-participant-slots">
              {p.totalSlots > 0 ? `${p.totalSlots} slot` : ""}
            </span>
            <span className={`analysis-participant-status ${p.status}`}>
              {STATUS_LABEL[p.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Content                                                       */
/* ------------------------------------------------------------------ */

function AnalysisContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetingId = params.id;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!meetingId) return;

    const unsubMeeting = onSnapshot(
      doc(db, "meetings", meetingId),
      (snap) => {
        if (!snap.exists()) {
          setError("Rapat tidak ditemukan.");
          setLoading(false);
          return;
        }
        const data = snap.data();
        setMeeting({
          id: snap.id,
          eventName: data.eventName || "",
          dates: data.dates || [],
          startHour: data.startHour || 8,
          endHour: data.endHour || 17,
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
        });
        setError(null);
      },
      () => {
        setError("Gagal memuat data rapat.");
        setLoading(false);
      },
    );

    const unsubParticipants = onSnapshot(
      collection(db, "meetings", meetingId, "participants"),
      (snap) => {
        const list: ParticipantData[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          list.push({
            id: doc.id,
            name: d.name || "",
            displayName: d.displayName || d.name || "",
            availability: d.availability || {},
          });
        });
        setParticipants(list);
        setLoading(false);
      },
      () => {
        setError("Gagal memuat data peserta.");
        setLoading(false);
      },
    );

    return () => {
      unsubMeeting();
      unsubParticipants();
    };
  }, [meetingId]);

  const slots = useMemo(
    () =>
      meeting ? generateSlots(meeting.startHour, meeting.endHour) : [],
    [meeting],
  );

  const metrics = useMemo(
    () => computeMetrics(participants, meeting?.dates || []),
    [participants, meeting],
  );

  const heatmap = useMemo(
    () => computeHeatmap(participants, meeting?.dates || [], slots),
    [participants, meeting, slots],
  );

  const recommendations = useMemo(() => {
    if (!meeting) return [];
    const blocks = findAllBlocks(
      participants,
      meeting.dates,
      meeting.startHour,
      meeting.endHour,
    );
    return rankRecommendations(blocks, 3);
  }, [participants, meeting]);

  const participantSummaries = useMemo(
    () => classifyParticipants(participants, meeting?.dates || []),
    [participants, meeting],
  );

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  const handleCopySummary = useCallback(() => {
    if (!meeting) return;
    const link = `${baseUrl}/?id=${meeting.id}`;
    const text = formatCopySummary(
      recommendations,
      meeting.eventName,
      participants.length,
      link,
    );
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [meeting, recommendations, participants.length, baseUrl]);

  if (loading) {
    return (
      <div className="analysis-wrap">
        <div className="loading" role="status">
          <div className="spinner" />
          <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            Memuat data analisis...
          </p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="analysis-wrap">
        <div className="analysis-header">
          <button className="btn btn-o" onClick={() => router.push("/admin/dashboard")}>
            ← Kembali
          </button>
        </div>
        <div className="analysis-empty">
          <p>{error || "Rapat tidak ditemukan."}</p>
          <button className="btn btn-p" onClick={() => router.push("/admin/dashboard")}>
            Ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-wrap">
      <div className="analysis-header">
        <button className="btn btn-o" onClick={() => router.push("/admin/dashboard")}>
          ← Kembali
        </button>
        <h1 className="analysis-title">{meeting.eventName}</h1>
        <button
          className="btn btn-p"
          onClick={() => router.push(`/admin/meetings/${meeting.id}`)}
        >
          Edit Rapat
        </button>
      </div>

      <div className="analysis-meta">
        {meeting.dates.length} tanggal · {floatToTimeStr(meeting.startHour)} –{" "}
        {floatToTimeStr(meeting.endHour)}
      </div>

      {participants.length === 0 ? (
        <div className="analysis-empty-state">
          <div className="analysis-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="analysis-empty-title">Belum cukup data</h2>
          <p className="analysis-empty-desc">
            Belum ada peserta yang mengisi ketersediaan. Bagikan link undangan
            untuk mulai mengumpulkan data.
          </p>
          <button
            className="btn btn-p"
            onClick={() => {
              const link = `${baseUrl}/?id=${meeting.id}`;
              navigator.clipboard.writeText(link);
            }}
          >
            Salin Link Undangan
          </button>
        </div>
      ) : (
        <>
          <MetricsBar
            totalParticipants={metrics.totalParticipants}
            filledSlots={metrics.filledSlots}
            activeDays={metrics.activeDays}
          />

          <div className="analysis-section">
            <Heatmap
              heatmap={heatmap}
              dates={meeting.dates}
              slots={slots}
              participants={participants}
            />
          </div>

          <Recommendations blocks={recommendations} />

          <ParticipantList summaries={participantSummaries} />

          <div className="analysis-copy-section">
            <button className="btn btn-p" onClick={handleCopySummary}>
              {copied ? "Tersalin!" : "Salin Ringkasan ke Clipboard"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <AuthGuard>
      <AnalysisContent />
    </AuthGuard>
  );
}
