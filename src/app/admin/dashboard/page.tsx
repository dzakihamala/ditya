"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/lib/AuthGuard";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { getMeetings, deleteMeeting } from "@/lib/meetings";
import { floatToTimeStr, formatDateShort } from "@/lib/date-utils";
import type { Meeting } from "@/lib/types";

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-msg">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-o" onClick={onCancel}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({
  meeting,
  onDelete,
  onEdit,
  onAnalyze,
}: {
  meeting: Meeting;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onAnalyze: (id: string) => void;
}) {
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  const link = `${baseUrl}/?id=${meeting.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link).catch(() => {});
  };

  let dateLabel: string;
  if (meeting.dates.length === 0) {
    dateLabel = "Belum ada tanggal";
  } else if (meeting.dates.length === 1) {
    dateLabel = formatDateShort(meeting.dates[0]);
  } else {
    dateLabel = `${meeting.dates.length} tanggal`;
  }

  return (
    <div className="meeting-card">
      <div className="meeting-card-body">
        <h3 className="meeting-name">{meeting.eventName}</h3>
        <div className="meeting-meta">
          <span className="meeting-meta-item">{dateLabel}</span>
          <span className="meeting-meta-sep">·</span>
          <span className="meeting-meta-item">
            {floatToTimeStr(meeting.startHour)}–{floatToTimeStr(meeting.endHour)}
          </span>
        </div>
        {meeting.dates.length > 0 && (
          <div className="meeting-dates-preview">
            {meeting.dates.slice(0, 5).map((d) => (
              <span key={d} className="date-chip">
                {formatDateShort(d)}
              </span>
            ))}
            {meeting.dates.length > 5 && (
              <span className="date-chip date-chip-more">
                +{meeting.dates.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="meeting-card-actions">
        <button
          className="btn btn-ghost btn-copy"
          onClick={copyLink}
          title="Salin link undangan"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Salin Link
        </button>
        <button
          className="btn btn-ghost btn-copy"
          onClick={() => onAnalyze(meeting.id)}
        >
          Analisis
        </button>
        <button
          className="btn btn-ghost btn-copy"
          onClick={() => onEdit(meeting.id)}
        >
          Edit
        </button>
        <button
          className="btn btn-r"
          onClick={() => onDelete(meeting.id)}
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      const list = await getMeetings(db);
      setMeetings(list);
    } catch {
      // silently handle — firestore errors are logged by the SDK
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMeeting(db, deleteId);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteId));
    } catch {
      // silently handle
    }
    setDeleteId(null);
  };

  return (
    <div className="dash">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard Admin</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => router.push("/admin/meetings/new")} className="btn btn-p">
            + Rapat Baru
          </button>
          <button onClick={signOut} className="btn btn-g" style={{ fontSize: 12 }}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : meetings.length === 0 ? (
        <div className="dash-empty">
          Belum ada rapat. Buat rapat pertama Anda.
        </div>
      ) : (
        <div className="meeting-list">
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onDelete={(id) => setDeleteId(id)}
              onEdit={(id) => router.push(`/admin/meetings/${id}`)}
              onAnalyze={(id) => router.push(`/admin/meetings/${id}/analysis`)}
            />
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Hapus rapat ini? Data ketersediaan peserta juga akan dihapus."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
