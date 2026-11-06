import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMobileDialogViewport } from "./useMobileDialogViewport";

const previousWidth = window.innerWidth;
const previousViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: previousWidth });
  if (previousViewport) Object.defineProperty(window, "visualViewport", previousViewport);
  else delete (window as unknown as { visualViewport?: unknown }).visualViewport;
});

describe("keyboard-aware dialog placement", () => {
  it("repositions a bottom sheet inside the visible viewport after keyboard resize", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const viewport = Object.assign(new EventTarget(), { height: 740, offsetTop: 0 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    const { result } = renderHook(() => useMobileDialogViewport(true, "bottom"));
    expect(result.current?.maxHeight).toBe("520px");
    act(() => {
      viewport.height = 390;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(result.current?.maxHeight).toBe("374px");
    expect(result.current?.top).toBe("8px");
    expect(result.current?.translate).toBe("-50% 0");
  });

  it("keeps desktop behavior unmodified", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    const { result } = renderHook(() => useMobileDialogViewport(true));
    expect(result.current).toBeUndefined();
  });
});
