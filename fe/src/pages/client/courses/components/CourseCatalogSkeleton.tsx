export function CourseCatalogSkeleton() {
  return (
    <div className="client-catalog-skeleton" aria-label="Loading course catalog">
      <section className="client-card client-catalog-skeleton__controls">
        <span className="client-skeleton-block client-catalog-skeleton__search" />
        <span className="client-skeleton-block client-catalog-skeleton__select" />
        <span className="client-skeleton-block client-catalog-skeleton__count" />
        <span className="client-skeleton-block client-catalog-skeleton__select" />
      </section>

      <section className="client-catalog-skeleton__grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={`card-${index}`} className="client-card client-catalog-skeleton__card">
            <span className="client-skeleton-block client-catalog-skeleton__badge" />
            <span className="client-skeleton-block client-catalog-skeleton__title" />
            <span className="client-skeleton-block client-catalog-skeleton__line" />
            <span className="client-skeleton-block client-catalog-skeleton__line client-catalog-skeleton__line--short" />
            <span className="client-skeleton-block client-catalog-skeleton__progress" />
            <span className="client-skeleton-block client-catalog-skeleton__button" />
          </article>
        ))}
      </section>
    </div>
  );
}
