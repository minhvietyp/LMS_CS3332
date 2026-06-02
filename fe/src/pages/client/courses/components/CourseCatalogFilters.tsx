import { Button, Input, Select, Typography } from 'antd';
import { Search } from 'lucide-react';

export type CourseCatalogFilterValue = {
  search: string;
  category: string;
  level: string;
  status: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type AppliedFilter = {
  key: string;
  label: string;
};

type CourseCatalogFiltersProps = {
  value: CourseCatalogFilterValue;
  categoryOptions: FilterOption[];
  levelOptions: FilterOption[];
  statusOptions: FilterOption[];
  appliedFilters: AppliedFilter[];
  resultCount: number;
  onChange: (next: CourseCatalogFilterValue) => void;
  onClearAll: () => void;
};

export function CourseCatalogFilters({
  value,
  categoryOptions,
  levelOptions,
  statusOptions,
  appliedFilters,
  resultCount,
  onChange,
  onClearAll,
}: CourseCatalogFiltersProps) {
  const hasAppliedFilters = appliedFilters.length > 0;

  const updateField = <K extends keyof CourseCatalogFilterValue>(key: K, nextValue: CourseCatalogFilterValue[K]) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  return (
    <div className="client-section client-catalog-filters">
      <div className="client-section-header">
        <div>
          <Typography.Title level={5} className="client-section-title">
            Refine courses
          </Typography.Title>
          <Typography.Paragraph className="client-meta">
            Search and narrow the catalog without leaving the current results view.
          </Typography.Paragraph>
        </div>
        {hasAppliedFilters ? (
          <Button className="client-button client-button-ghost" onClick={onClearAll}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="client-grid client-catalog-filters__fields">
        <label className="client-field">
          <span className="client-label">Search</span>
          <Input
            size="large"
            className="client-input"
            prefix={<Search size={16} />}
            placeholder="Search by course title, instructor, or topic"
            value={value.search}
            onChange={(event) => updateField('search', event.target.value)}
            aria-label="Search by course title, instructor, or topic"
          />
        </label>

        <label className="client-field">
          <span className="client-label">Category</span>
          <Select
            size="large"
            value={value.category}
            className="client-select"
            options={categoryOptions}
            onChange={(nextValue) => updateField('category', nextValue)}
            aria-label="Filter by category"
          />
        </label>

        <label className="client-field">
          <span className="client-label">Level</span>
          <Select
            size="large"
            value={value.level}
            className="client-select"
            options={levelOptions}
            onChange={(nextValue) => updateField('level', nextValue)}
            aria-label="Filter by level"
          />
        </label>

        <label className="client-field">
          <span className="client-label">Status</span>
          <Select
            size="large"
            value={value.status}
            className="client-select"
            options={statusOptions}
            onChange={(nextValue) => updateField('status', nextValue)}
            aria-label="Filter by status"
          />
        </label>
      </div>

      <div className="client-catalog-filters__summary">
        <div className="client-catalog-filters__summary-copy">
          <span className="client-card-title">{resultCount} result{resultCount === 1 ? '' : 's'}</span>
          <span className="client-meta">
            {hasAppliedFilters ? 'Applied filters update the visible course grid only.' : 'No filters applied.'}
          </span>
        </div>
        <div className="client-catalog-filters__chips" aria-label="Applied filters">
          {hasAppliedFilters ? (
            <>
              {appliedFilters.map((filter) => (
                <span key={filter.key} className="client-badge client-badge-info">
                  {filter.label}
                </span>
              ))}
              <Button className="client-button client-button-ghost client-catalog-filters__clear-all" onClick={onClearAll}>
                Clear all
              </Button>
            </>
          ) : (
            <span className="client-meta">Use search, category, level, or status to narrow the grid.</span>
          )}
        </div>
      </div>
    </div>
  );
}
