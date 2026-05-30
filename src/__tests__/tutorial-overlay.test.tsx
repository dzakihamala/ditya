import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { TutorialOverlay } from "@/app/tutorial-overlay";

const STORAGE_KEY = "tutorial-seen";

describe("TutorialOverlay", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("shows step 1 content by default", () => {
      const { container } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      expect(container.textContent).toContain("Tekan & tahan di grid");
      expect(container.textContent).toContain("untuk buat blok waktu 1 jam");
    });

    it("shows dot indicators with first dot active", () => {
      const { container } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      const dots = container.querySelectorAll(".tut-dot");
      expect(dots).toHaveLength(3);
      expect(dots[0].classList.contains("active")).toBe(true);
      expect(dots[1].classList.contains("active")).toBe(false);
      expect(dots[2].classList.contains("active")).toBe(false);
    });

    it("shows Lanjut button on steps 1 and 2", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      expect(getByText("Lanjut")).toBeTruthy();
      expect(container.textContent).toContain("Lewati");
    });

    it("shows Selesai button on step 3 instead of Lanjut", () => {
      const { getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      // Advance to step 3
      fireEvent.click(getByText("Lanjut"));
      fireEvent.click(getByText("Lanjut"));

      expect(() => getByText("Lanjut")).toThrow();
      expect(getByText("Selesai")).toBeTruthy();
    });
  });

  describe("step navigation", () => {
    it("advances to step 2 when Lanjut is clicked", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      fireEvent.click(getByText("Lanjut"));

      expect(container.textContent).toContain("Geser ujung atas/bawah blok");
      expect(container.textContent).toContain("untuk menyesuaikan durasi");
    });

    it("advances to step 3 when Lanjut is clicked twice", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      fireEvent.click(getByText("Lanjut"));
      fireEvent.click(getByText("Lanjut"));

      expect(container.textContent).toContain("Geser tengah blok");
      expect(container.textContent).toContain("untuk memindahkan ke waktu atau hari lain");
    });

    it("updates dot indicators as steps advance", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      const dots = container.querySelectorAll(".tut-dot");

      fireEvent.click(getByText("Lanjut"));
      expect(dots[0].classList.contains("active")).toBe(false);
      expect(dots[1].classList.contains("active")).toBe(true);

      fireEvent.click(getByText("Lanjut"));
      expect(dots[1].classList.contains("active")).toBe(false);
      expect(dots[2].classList.contains("active")).toBe(true);
    });
  });

  describe("dismissal", () => {
    it("hides overlay when Lewati is clicked", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      fireEvent.click(getByText("Lewati"));

      expect(container.querySelector(".tut-overlay")).toBeNull();
    });

    it("sets localStorage when Lewati is clicked", () => {
      const { getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      fireEvent.click(getByText("Lewati"));

      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    it("sets localStorage when Selesai is clicked on last step", () => {
      const { getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      fireEvent.click(getByText("Lanjut"));
      fireEvent.click(getByText("Lanjut"));
      fireEvent.click(getByText("Selesai"));

      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    it("hides overlay when Selesai is clicked", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      fireEvent.click(getByText("Lanjut"));
      fireEvent.click(getByText("Lanjut"));
      fireEvent.click(getByText("Selesai"));

      expect(container.querySelector(".tut-overlay")).toBeNull();
    });
  });

  describe("localStorage persistence", () => {
    it("does not render when localStorage key is already set", () => {
      localStorage.setItem(STORAGE_KEY, "true");

      const { container } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      expect(container.querySelector(".tut-overlay")).toBeNull();
    });

    it("renders when localStorage key is not set", () => {
      const { container } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      expect(container.querySelector(".tut-overlay")).toBeTruthy();
    });
  });

  describe("visual illustrations", () => {
    it("renders a visual container for each step", () => {
      const { container, getByText } = render(
        <TutorialOverlay storageKey={STORAGE_KEY} />,
      );

      expect(container.querySelector(".tut-visual")).toBeTruthy();

      fireEvent.click(getByText("Lanjut"));
      expect(container.querySelector(".tut-visual")).toBeTruthy();

      fireEvent.click(getByText("Lanjut"));
      expect(container.querySelector(".tut-visual")).toBeTruthy();
    });
  });
});
