/** Reusable brand mark without importing the authenticated app shell. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="mm-logo inline-flex items-center gap-2.5">
      <span className="mm-logo-leaves" aria-hidden="true">
        <span className="mm-logo-leaf mm-logo-leaf--left" />
        <span className="mm-logo-leaf mm-logo-leaf--right" />
      </span>
      {!compact && <span className="mm-logo-name">Macro Mint</span>}
    </span>
  );
}
