export function CourseDetailSkeleton() {
  return (
    <div className="course-detail-shell course-detail-shell--loading" aria-live="polite" aria-label="Loading course detail">
      <section className="client-card client-section course-detail-shell__hero">
        <div className="course-detail-shell__hero-copy">
          <span className="client-skeleton-block course-detail-shell__skeleton-eyebrow" />
          <span className="client-skeleton-block course-detail-shell__skeleton-title" />
          <span className="client-skeleton-block course-detail-shell__skeleton-body" />
          <span className="client-skeleton-block course-detail-shell__skeleton-body course-detail-shell__skeleton-body--short" />
          <div className="course-detail-shell__hero-facts">
            <span className="client-skeleton-block course-detail-shell__skeleton-stat" />
            <span className="client-skeleton-block course-detail-shell__skeleton-stat" />
            <span className="client-skeleton-block course-detail-shell__skeleton-stat" />
          </div>
          <div className="course-detail-shell__hero-actions">
            <span className="client-skeleton-block course-detail-shell__skeleton-button" />
            <span className="client-skeleton-block course-detail-shell__skeleton-button" />
          </div>
        </div>
        <div className="course-detail-shell__hero-summary">
          <span className="client-skeleton-block course-detail-shell__skeleton-preview" />
          <div className="course-detail-shell__hero-summary-card">
            <span className="client-skeleton-block course-detail-shell__skeleton-card-title" />
            <span className="client-skeleton-block course-detail-shell__skeleton-body" />
            <span className="client-skeleton-block course-detail-shell__skeleton-body course-detail-shell__skeleton-body--short" />
          </div>
        </div>
      </section>

      <div className="course-detail-shell__layout">
        <main className="course-detail-shell__main">
          {[0, 1, 2, 3, 4].map((section) => (
            <section key={section} className="client-card client-section course-detail-shell__section">
              <div className="course-detail-shell__section-header">
                <span className="client-skeleton-block course-detail-shell__skeleton-section-title" />
                <span className="client-skeleton-block course-detail-shell__skeleton-body" />
              </div>
              <div className="course-detail-shell__skeleton-section-grid">
                <span className="client-skeleton-block course-detail-shell__skeleton-panel" />
                <span className="client-skeleton-block course-detail-shell__skeleton-panel" />
              </div>
            </section>
          ))}
        </main>

        <aside className="course-detail-shell__sidebar">
          {[0, 1, 2, 3].map((card) => (
            <section key={card} className="client-card course-detail-shell__sidebar-card">
              <span className="client-skeleton-block course-detail-shell__skeleton-card-title" />
              <span className="client-skeleton-block course-detail-shell__skeleton-body" />
              <span className="client-skeleton-block course-detail-shell__skeleton-panel" />
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
