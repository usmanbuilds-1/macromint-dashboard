/** A quiet text state, not an empty chart-shaped decorative box. */
export function EmptyChart({ message }: { message: string }) {
  return <div className="mm-journey-chart-empty">{message}</div>;
}
