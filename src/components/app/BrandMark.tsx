/** Reusable brand mark without importing the authenticated app shell. */
export function Logo({ compact = false, miniature = false }: { compact?: boolean; miniature?: boolean }) {
  return (
    <span className={`mm-logo inline-flex items-center ${miniature ? "mm-logo--miniature" : ""}`}>
      <span className="mm-logo-leaves" aria-hidden="true">
        <span className="mm-logo-leaf mm-logo-leaf--left" />
        <span className="mm-logo-leaf mm-logo-leaf--right" />
      </span>
      {!compact && <span className="mm-logo-name">Macro Mint</span>}
    </span>
  );
}
