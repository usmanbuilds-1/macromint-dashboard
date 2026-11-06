import { useEffect, useState, type CSSProperties } from "react";

/**
 * Android keyboard and iOS Safari do not consistently resize 100dvh.
 * Keep dialogs inside the *visual* viewport, including after keyboard
 * open/close, orientation changes and browser chrome movement.
 */
export function useMobileDialogViewport(open: boolean, placement: "bottom" | "center" = "center"): CSSProperties | undefined {
  const [size, setSize] = useState<{ height: number; top: number; mobile: boolean } | null>(null);

  useEffect(() => {
    if (!open) {
      setSize(null);
      return;
    }
    const viewport = window.visualViewport;
    const update = () => {
      setSize({
        height: viewport?.height ?? window.innerHeight,
        top: viewport?.offsetTop ?? 0,
        mobile: window.innerWidth < 640,
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  if (!size?.mobile) return undefined;
  const available = Math.max(100, size.height - 16);
  const height = Math.min(520, available);
  const top = size.top + (placement === "bottom" ? size.height - height - 8 : (size.height - height) / 2);
  return { top: `${Math.max(0, top)}px`, bottom: "auto", maxHeight: `${height}px`, translate: "-50% 0" };
}
