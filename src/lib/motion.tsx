import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

/** The GLM reference used CSS view timelines. Keep content visible when they
 * are unavailable, when scripts are disabled, and for reduced motion. */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  as?: "div" | "section" | "article" | "li" | "figure" | "header";
  className?: string;
  delay?: number;
}) {
  return (
    <Tag
      className={className}
      data-mm-reveal=""
      style={{ "--mm-reveal-delay": `${Math.max(0, Math.min(delay, 400))}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animate only actual live numeric values, never fabricate intermediate data. */
export function useAnimatedNumber(value: number, duration = 550): number {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    if (!Number.isFinite(value) || reducedMotion()) {
      previous.current = value;
      setShown(value);
      return;
    }
    const from = previous.current;
    if (from === value) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else previous.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      // A new value should start from the number the UI last reached.
      previous.current = value;
    };
  }, [value, duration]);
  return Number.isFinite(shown) ? shown : value;
}

/** Reusable static-on-first-paint entrance flag for progress strokes. */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}
