export function CourseCatalogSkeleton() {
  return (
    <div className="client-catalog-skeleton" aria-label="Loading course catalog">
      <section className="client-card client-catalog-skeleton__hero">
        <div className="client-catalog-skeleton__hero-copy">
          <span className="client-skeleton-block client-catalog-skeleton__eyebrow" />
          <span className="client-skeleton-block client-catalog-skeleton__title" />
          <span className="client-skeleton-block client-catalog-skeleton__body" />
          <span className="client-skeleton-block client-catalog-skeleton__body client-catalog-skeleton__body--short" />
          <div className="client-catalog-skeleton__actions">
            <span className="client-skeleton-block client-catalog-skeleton__button" />
            <span className="client-skeleton-block client-catalog-skeleton__button" />
          </div>
        </div>

        <div className="client-catalog-skeleton__hero-metrics">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`metric-${index}`} className="client-card client-catalog-skeleton__metric">
              <span className="client-skeleton-block client-catalog-skeleton__metric-label" />
              <span className="client-skeleton-block client-catalog-skeleton__metric-value" />
              <span className="client-skeleton-block client-catalog-skeleton__metric-caption" />
            </div>
          ))}
          <div className="client-card client-catalog-skeleton__metric client-catalog-skeleton__metric--wide">
            <span className="client-skeleton-block client-catalog-skeleton__metric-label" />
            <span className="client-skeleton-block client-catalog-skeleton__metric-value client-catalog-skeleton__metric-value--wide" />
            <span className="client-skeleton-block client-catalog-skeleton__metric-caption" />
            <span className="client-skeleton-block client-catalog-skeleton__metric-caption client-catalog-skeleton__metric-caption--long" />
          </div>
        </div>
      </section>

      <section className="client-card client-catalog-skeleton__canvas">
        <div className="client-card client-catalog-skeleton__toolbar">
          <div className="client-catalog-skeleton__toolbar-copy">
            <span className="client-skeleton-block client-catalog-skeleton__toolbar-title" />
            <span className="client-skeleton-block client-catalog-skeleton__toolbar-body" />
          </div>
          <div className="client-catalog-skeleton__toolbar-actions">
            <span className="client-skeleton-block client-catalog-skeleton__chip" />
            <span className="client-skeleton-block client-catalog-skeleton__select" />
          </div>
        </div>

        <div className="client-catalog-skeleton__body">
          <aside className="client-card client-catalog-skeleton__filters">
            <span className="client-skeleton-block client-catalog-skeleton__filters-title" />
            <span className="client-skeleton-block client-catalog-skeleton__field" />
            <span className="client-skeleton-block client-catalog-skeleton__field" />
            <span className="client-skeleton-block client-catalog-skeleton__field" />
            <span className="client-skeleton-block client-catalog-skeleton__field" />
            <span className="client-skeleton-block client-catalog-skeleton__filters-button" />
          </aside>

          <div className="client-catalog-skeleton__results">
            <div className="client-catalog-skeleton__grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <article key={`card-${index}`} className="client-card client-catalog-skeleton__card">
                  <span className="client-skeleton-block client-catalog-skeleton__card-media" />
                  <div className="client-catalog-skeleton__card-copy">
                    <span className="client-skeleton-block client-catalog-skeleton__card-badges" />
                    <span className="client-skeleton-block client-catalog-skeleton__card-title" />
                    <span className="client-skeleton-block client-catalog-skeleton__card-body" />
                    <span className="client-skeleton-block client-catalog-skeleton__card-body client-catalog-skeleton__card-body--short" />
                  </div>
                  <div className="client-catalog-skeleton__card-actions">
                    <span className="client-skeleton-block client-catalog-skeleton__button" />
                    <span className="client-skeleton-block client-catalog-skeleton__button client-catalog-skeleton__button--secondary" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
