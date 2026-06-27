export function InlineSpinner({ label = "Loading" }) {
  return <span className="app-spinner" role="status" aria-label={label} />;
}

export function LoadingState({ label = "Loading data...", compact = false }) {
  return (
    <div className={`app-loading-state${compact ? " is-compact" : ""}`} role="status" aria-live="polite">
      <InlineSpinner label={label} />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="app-skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="app-skeleton-card" key={index}>
          <span className="app-skeleton app-skeleton-avatar" />
          <span className="app-skeleton-copy">
            <span className="app-skeleton app-skeleton-title" />
            <span className="app-skeleton app-skeleton-line" />
          </span>
          <span className="app-skeleton app-skeleton-action" />
        </div>
      ))}
    </div>
  );
}
