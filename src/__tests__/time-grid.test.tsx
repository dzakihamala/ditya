import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TimeGrid } from "@/app/time-grid";

describe("TimeGrid", () => {
  const dates = ["2026-06-15", "2026-06-16", "2026-06-17"];
  const startHour = 8;
  const endHour = 10;
  const emptyAvailability: Record<string, string[]> = {};

  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("rendering", () => {
    it("renders time labels for each 30-min slot", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const labels = container.querySelectorAll(".tg-label");
      expect(labels).toHaveLength(4); // 08:00, 08:30, 09:00, 09:30
      expect(labels[0].textContent).toBe("08:00");
      expect(labels[2].textContent).toBe("09:00");
    });

    it("renders day headers with day name + date", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const headers = container.querySelectorAll(".tg-header");
      expect(headers).toHaveLength(3);
    });

    it("renders hour guide lines at :00 (solid) and :30 (dashed)", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const hourLines = container.querySelectorAll(".tg-line-hour");
      const halfLines = container.querySelectorAll(".tg-line-half");
      // 08:00-10:00 = 4 slots, 2 solid + 2 dashed per column, 3 columns = 6 each
      expect(hourLines.length).toBe(6);
      expect(halfLines.length).toBe(6);
    });

    it("renders grid columns matching dates count", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const cols = container.querySelectorAll(".tg-col");
      expect(cols).toHaveLength(3);
    });

    it("has a scrollable container", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const scroll = container.querySelector(".tg-scroll");
      expect(scroll).toBeTruthy();
    });
  });

  describe("availability blocks", () => {
    it("renders green blocks for availability", () => {
      const availability = { "2026-06-15": ["08:00", "08:30"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const blocks = container.querySelectorAll(".tg-block");
      expect(blocks).toHaveLength(1);
    });

    it("renders multiple blocks for non-contiguous ranges on same date", () => {
      const availability = { "2026-06-15": ["08:00", "09:00"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const blocks = container.querySelectorAll(".tg-block");
      expect(blocks).toHaveLength(2);
    });

    it("renders blocks across multiple dates", () => {
      const availability = {
        "2026-06-15": ["08:00", "08:30"],
        "2026-06-16": ["09:00", "09:30"],
      };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const blocks = container.querySelectorAll(".tg-block");
      expect(blocks).toHaveLength(2);
    });
  });

  describe("GCal conflicts", () => {
    it("renders gray transparent blocks for GCal-only conflicts", () => {
      const conflicts = { "2026-06-15": ["09:00", "09:30"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={conflicts}
          onChange={onChange}
        />,
      );

      const conflictBlocks = container.querySelectorAll(".tg-conflict");
      expect(conflictBlocks).toHaveLength(1);
    });

    it("renders conflict+selected blocks with right-strip indicator", () => {
      const availability = { "2026-06-15": ["08:00", "08:30"] };
      const conflicts = { "2026-06-15": ["08:00"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={conflicts}
          onChange={onChange}
        />,
      );

      const block = container.querySelector(".tg-block.has-conflict");
      expect(block).toBeTruthy();
    });
  });

  describe("click to create", () => {
    it("creates 1-hour block on click in empty area", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const area = container.querySelector(".tg-area")!;
      // Click at position that maps to first date, first slot (08:00)
      fireEvent.mouseDown(area, { clientX: 60, clientY: 10 });
      fireEvent.mouseUp(area, { clientX: 60, clientY: 10 });

      expect(onChange).toHaveBeenCalledWith({
        "2026-06-15": ["08:00", "08:30"],
      });
    });
  });

  describe("drag resize", () => {
    it("resizes block from bottom edge", () => {
      const availability = { "2026-06-15": ["08:00", "08:30"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const block = container.querySelector(".tg-block")!;
      const area = container.querySelector(".tg-area")!;

      // Drag bottom edge down by one slot
      // Fire mousedown on block to start resize
      fireEvent.mouseDown(block, { clientX: 40, clientY: 52 });
      // Fire mousemove on grid area (where the handler is)
      fireEvent.mouseMove(area, { clientX: 40, clientY: 80 });
      // Fire mouseup on grid area
      fireEvent.mouseUp(area, { clientX: 40, clientY: 80 });

      expect(onChange).toHaveBeenCalledWith({
        "2026-06-15": ["08:00", "08:30", "09:00"],
      });
    });

    it("resizes block from top edge", () => {
      const availability = { "2026-06-15": ["08:00", "08:30"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const block = container.querySelector(".tg-block")!;

      // Drag top edge up by one slot (beyond viewport, but clamped)
      fireEvent.mouseDown(block, { clientX: 40, clientY: 2 });
      fireEvent.mouseMove(block, { clientX: 40, clientY: -26 });
      fireEvent.mouseUp(block);

      expect(onChange).toHaveBeenCalledWith({
        "2026-06-15": ["08:00", "08:30"],
      });
    });
  });

  describe("drag move", () => {
    it("moves block to a different time on the same date", () => {
      const availability = { "2026-06-15": ["08:00", "08:30"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const block = container.querySelector(".tg-block")!;
      const area = container.querySelector(".tg-area")!;

      // Start drag in middle of block
      fireEvent.mouseDown(block, { clientX: 40, clientY: 14 });
      // Move down by 2 slots (fire on area where handler lives)
      fireEvent.mouseMove(area, { clientX: 40, clientY: 70 });
      fireEvent.mouseUp(area, { clientX: 40, clientY: 70 });

      expect(onChange).toHaveBeenCalled();
      const calls = onChange.mock.calls;
      const last = calls[calls.length - 1][0];
      expect(last["2026-06-15"]).toContain("09:00");
      expect(last["2026-06-15"]).toContain("09:30");
      expect(last["2026-06-15"]).not.toContain("08:00");
    });

    it("moves block to a different date column", () => {
      const availability = { "2026-06-15": ["08:00", "08:30"] };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const block = container.querySelector(".tg-block")!;
      const area = container.querySelector(".tg-area")!;

      // Start drag in middle of block
      fireEvent.mouseDown(block, { clientX: 40, clientY: 14 });
      // Move to second date column (fire on area where handler lives)
      fireEvent.mouseMove(area, { clientX: 120, clientY: 14 });
      fireEvent.mouseUp(area, { clientX: 120, clientY: 14 });

      expect(onChange).toHaveBeenCalled();
      const calls = onChange.mock.calls;
      const last = calls[calls.length - 1][0];
      expect(last["2026-06-15"]).toEqual([]);
      expect(last["2026-06-16"]).toContain("08:00");
      expect(last["2026-06-16"]).toContain("08:30");
    });
  });

  describe("hint", () => {
    it("does not show hint when fewer than 4 days filled", () => {
      const availability = {
        "2026-06-15": ["08:00"],
        "2026-06-16": ["08:00"],
        "2026-06-17": ["08:00"],
      };
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      expect(container.textContent).not.toContain("hari lagi");
    });

    it("shows hint when 4 or more days are filled and there are remaining dates", () => {
      const manyDates = ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20"];
      const availability = {
        "2026-06-15": ["08:00"],
        "2026-06-16": ["08:00"],
        "2026-06-17": ["08:00"],
        "2026-06-18": ["08:00"],
      };
      const { container } = render(
        <TimeGrid
          dates={manyDates}
          startHour={startHour}
          endHour={endHour}
          availability={availability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      expect(container.textContent).toContain("hari lagi");
    });
  });

  describe("static hint text", () => {
    it("always shows hint text below the grid", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      expect(container.textContent).toContain("Tekan untuk buat blok");
      expect(container.textContent).toContain("Geser ujung untuk atur durasi");
      expect(container.textContent).toContain("Drag tengah untuk pindahkan");
    });

    it("uses tg-hint-static class", () => {
      const { container } = render(
        <TimeGrid
          dates={dates}
          startHour={startHour}
          endHour={endHour}
          availability={emptyAvailability}
          conflicts={{}}
          onChange={onChange}
        />,
      );

      const hint = container.querySelector(".tg-hint-static");
      expect(hint).toBeTruthy();
    });
  });
});
