import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DateChips } from "@/app/date-chips";
import { TimeRangePicker } from "@/app/time-range-picker";
import { TimeBar } from "@/app/time-bar";

describe("DateChips", () => {
  const dates = ["2026-06-15", "2026-06-16", "2026-06-17"];
  const availability = {
    "2026-06-15": ["08:00", "08:30"],
    "2026-06-16": [],
  };

  let onDateChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onDateChange = vi.fn();
  });

  it("renders a chip for each date", () => {
    const { container } = render(
      <DateChips
        dates={dates}
        availability={availability}
        activeDate="2026-06-16"
        onDateChange={onDateChange}
      />,
    );
    const chips = container.querySelectorAll(".ts-date-chip");
    expect(chips).toHaveLength(3);
  });

  it("applies filled class to dates with selected slots", () => {
    const { container } = render(
      <DateChips
        dates={dates}
        availability={availability}
        activeDate="2026-06-17"
        onDateChange={onDateChange}
      />,
    );
    const chips = container.querySelectorAll(".ts-date-chip");
    expect(chips[0].className).toContain("filled");
  });

  it("applies skipped class to dates with empty array", () => {
    const { container } = render(
      <DateChips
        dates={dates}
        availability={availability}
        activeDate="2026-06-15"
        onDateChange={onDateChange}
      />,
    );
    const chips = container.querySelectorAll(".ts-date-chip");
    // Second date (Jun 16) is skipped
    expect(chips[1].className).toContain("skipped");
  });

  it("applies active class to the active date", () => {
    const { container } = render(
      <DateChips
        dates={dates}
        availability={availability}
        activeDate="2026-06-16"
        onDateChange={onDateChange}
      />,
    );
    const chips = container.querySelectorAll(".ts-date-chip");
    expect(chips[1].className).toContain("active");
  });

  it("calls onDateChange when a chip is clicked", () => {
    const { container } = render(
      <DateChips
        dates={dates}
        availability={availability}
        activeDate="2026-06-16"
        onDateChange={onDateChange}
      />,
    );
    const chips = container.querySelectorAll(".ts-date-chip");
    fireEvent.click(chips[2]); // Third chip (Jun 17)
    expect(onDateChange).toHaveBeenCalledWith("2026-06-17");
  });

  it("shows checkmark for filled dates, x for skipped, dash for pending", () => {
    const { container } = render(
      <DateChips
        dates={dates}
        availability={availability}
        activeDate="2026-06-17"
        onDateChange={onDateChange}
      />,
    );

    const chips = container.querySelectorAll(".ts-date-chip");
    // First chip: filled (Jun 15), Second: skipped (Jun 16), Third: pending (Jun 17/active)
    expect(chips[0].textContent).toContain("✓");
    expect(chips[1].textContent).toContain("✗");
    expect(chips[2].textContent).toContain("—");
  });
});

describe("TimeRangePicker", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renders Dari jam and Sampai jam labels", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={[]}
        startHour={8}
        endHour={17}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    expect(container.textContent).toContain("Dari jam");
    expect(container.textContent).toContain("Sampai jam");
  });

  it("renders Seharian and Tambah buttons", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={[]}
        startHour={8}
        endHour={17}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    expect(container.textContent).toContain("Seharian");
    expect(container.textContent).toContain("+ Tambah");
  });

  it("displays range chips from selectedSlots", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={["08:00", "08:30"]}
        startHour={8}
        endHour={17}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    const chips = container.querySelectorAll(".trp-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain("08:00");
    expect(chips[0].textContent).toContain("09:00");
  });

  it("displays multiple non-contiguous range chips", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={["08:00", "08:30", "12:00", "12:30"]}
        startHour={8}
        endHour={17}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    const chips = container.querySelectorAll(".trp-chip");
    expect(chips).toHaveLength(2);
  });

  it("marks conflict chips", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={["08:00", "08:30"]}
        startHour={8}
        endHour={17}
        conflicts={["08:00"]}
        onChange={onChange}
      />,
    );

    const chip = container.querySelector(".trp-chip.conflict");
    expect(chip).toBeTruthy();
  });

  it("shows conflict hint when conflicts exist", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={[]}
        startHour={8}
        endHour={17}
        conflicts={["08:00"]}
        onChange={onChange}
      />,
    );

    expect(container.textContent).toContain("Google Calendar");
  });

  it("does not show conflict hint when no conflicts", () => {
    const { container } = render(
      <TimeRangePicker
        selectedSlots={[]}
        startHour={8}
        endHour={17}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    expect(container.textContent).not.toContain("Google Calendar");
  });
});

describe("TimeBar", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renders hour labels", () => {
    const { container } = render(
      <TimeBar
        selectedSlots={[]}
        startHour={8}
        endHour={11}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    const labels = container.querySelector(".time-bar-labels");
    expect(labels?.textContent).toContain("08:00");
    expect(labels?.textContent).toContain("09:00");
    expect(labels?.textContent).toContain("10:00");
    expect(labels?.textContent).toContain("11:00");
  });

  it("renders correct number of slots", () => {
    const { container } = render(
      <TimeBar
        selectedSlots={[]}
        startHour={8}
        endHour={10}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    const slots = container.querySelectorAll(".time-bar-slot");
    expect(slots).toHaveLength(4); // 2 hours * 2 slots
  });

  it("marks selected slots", () => {
    const { container } = render(
      <TimeBar
        selectedSlots={["08:00", "08:30"]}
        startHour={8}
        endHour={10}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    const selected = container.querySelectorAll(".time-bar-slot.sel");
    expect(selected).toHaveLength(2);
  });

  it("marks conflict slots", () => {
    const { container } = render(
      <TimeBar
        selectedSlots={[]}
        startHour={8}
        endHour={10}
        conflicts={["09:00"]}
        onChange={onChange}
      />,
    );

    const conflictSlots = container.querySelectorAll(
      ".time-bar-slot.conflict",
    );
    expect(conflictSlots).toHaveLength(1);
  });

  it("shows conflict legend when conflicts exist", () => {
    const { container } = render(
      <TimeBar
        selectedSlots={[]}
        startHour={8}
        endHour={10}
        conflicts={["09:00"]}
        onChange={onChange}
      />,
    );

    expect(container.textContent).toContain("GCal");
  });

  it("does not show GCal legend when no conflicts", () => {
    const { container } = render(
      <TimeBar
        selectedSlots={[]}
        startHour={8}
        endHour={10}
        conflicts={[]}
        onChange={onChange}
      />,
    );

    expect(container.textContent).not.toContain("GCal");
  });
});
