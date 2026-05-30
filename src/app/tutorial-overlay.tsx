"use client";

import { useState } from "react";

interface TutorialOverlayProps {
  storageKey: string;
}

const STEPS = [
  {
    title: "Tekan & tahan di grid",
    subtitle: "untuk buat blok waktu 1 jam",
    visual: "create",
  },
  {
    title: "Geser ujung atas/bawah blok",
    subtitle: "untuk menyesuaikan durasi",
    visual: "resize",
  },
  {
    title: "Geser tengah blok",
    subtitle: "untuk memindahkan ke waktu atau hari lain",
    visual: "move",
  },
] as const;

function TutorialVisual({ visual }: { visual: string }) {
  return (
    <div className="tut-visual">
      {visual === "create" && (
        <div className="tut-visual-create">
          <div className="tut-mini-grid">
            <div className="tut-mini-time">08:00</div>
            <div className="tut-mini-slot tut-mini-empty" />
            <div className="tut-mini-time">08:30</div>
            <div className="tut-mini-slot tut-mini-empty" />
            <div className="tut-mini-time">09:00</div>
            <div className="tut-mini-slot tut-mini-empty" />
          </div>
          <div className="tut-cursor" />
          <div className="tut-created-block" />
        </div>
      )}

      {visual === "resize" && (
        <div className="tut-visual-resize">
          <div className="tut-mini-grid">
            <div className="tut-mini-time">08:00</div>
            <div className="tut-mini-slot tut-mini-empty" />
            <div className="tut-mini-time">08:30</div>
            <div className="tut-mini-slot tut-mini-empty" />
            <div className="tut-mini-time">09:00</div>
            <div className="tut-mini-slot tut-mini-empty" />
          </div>
          <div className="tut-block-base" />
          <div className="tut-resize-arrow tut-resize-arrow-down" />
        </div>
      )}

      {visual === "move" && (
        <div className="tut-visual-move">
          <div className="tut-mini-grid">
            <div className="tut-mini-time">08:00</div>
            <div className="tut-mini-slot tut-mini-empty" />
            <div className="tut-mini-time">08:30</div>
            <div className="tut-mini-slot tut-mini-empty" />
            <div className="tut-mini-time">09:00</div>
            <div className="tut-mini-slot tut-mini-empty" />
          </div>
          <div className="tut-block-base tut-block-moved" />
          <div className="tut-move-arrow" />
        </div>
      )}
    </div>
  );
}

export function TutorialOverlay({ storageKey }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) !== "true";
    }
    return true;
  });

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(storageKey, "true");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const current = STEPS[step];

  return (
    <div className="tut-overlay">
      <div className="tut-card">
        <TutorialVisual visual={current.visual} />

        <div className="tut-text">
          <h2 className="tut-title">{current.title}</h2>
          <p className="tut-subtitle">{current.subtitle}</p>
        </div>

        <div className="tut-dots">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tut-dot${i === step ? " active" : ""}`}
            />
          ))}
        </div>

        <div className="tut-actions">
          <button className="btn btn-o tut-skip" onClick={dismiss}>
            Lewati
          </button>
          <button className="btn btn-p tut-next" onClick={next}>
            {step < STEPS.length - 1 ? "Lanjut" : "Selesai"}
          </button>
        </div>
      </div>
    </div>
  );
}
