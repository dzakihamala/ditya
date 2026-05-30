"use client";

import { useState } from "react";
import { formatDateLong } from "@/lib/date-utils";
import type { ContiguousBlock } from "@/lib/analysis";

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
