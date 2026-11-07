import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DiaryEntry } from "@/types";
import { TodayNextStep } from "./TodayNextStep";

describe("Next step on Today", () => {
  it("never invents a previous food for a new user", () => {
    render(<TodayNextStep previous={null} onRepeat={vi.fn()} />);
    expect(screen.getByText("Start with one food.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Log again/ })).toBeNull();
  });
  it("opens portion review for a genuinely logged food", () => {
    const spy = vi.fn();
    const entry = { id: "1", name: "Daal" } as DiaryEntry;
    render(<TodayNextStep previous={entry} onRepeat={spy} />);
    fireEvent.click(screen.getByRole("button", { name: /Log again/ }));
    expect(spy).toHaveBeenCalledWith(entry);
  });
});
