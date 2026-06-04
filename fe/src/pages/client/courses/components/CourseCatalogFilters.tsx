import { Button, Input, Select } from 'antd';
import { Search } from 'lucide-react';

export type CourseCatalogFilterValue = {
  search: string;
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
  statusOptions: FilterOption[];
  appliedFilters: AppliedFilter[];
  resultCount: number;
  totalCount: number;
  onChange: (next: CourseCatalogFilterValue) => void;
  onClearAll: () => void;
};

export function CourseCatalogFilters({
  value,
  statusOptions,
  appliedFilters,
  resultCount,
  totalCount,
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
    <div className="client-catalog-filters">
      <label className="client-field client-catalog-filters__search">
        <span className="client-label">Search</span>
        <Input
          size="large"
          className="client-input"
          prefix={<Search size={16} />}
          placeholder="Search courses, instructors, or topics"
          value={value.search}
          onChange={(event) => updateField('search', event.target.value)}
          aria-label="Search courses, instructors, or topics"
        />
      </label>

      <label className="client-field client-catalog-filters__status">
        <span className="client-label">Status</span>
        <Select
          size="large"
          value={value.status}
          className="client-select"
          options={statusOptions}
          onChange={(nextValue) => updateField('status', nextValue)}
          aria-label="Filter courses by status"
        />
      </label>

      <div className="client-catalog-filters__result">
        <div>
          <span className="client-card-title">{resultCount} result{resultCount === 1 ? '' : 's'}</span>
          <span className="client-meta">from {totalCount} course{totalCount === 1 ? '' : 's'}</span>
        </div>
        {hasAppliedFilters ? (
          <Button className="client-button client-button-ghost client-catalog-filters__clear" onClick={onClearAll}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
