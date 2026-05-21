import React, { useState } from 'react';
import './styles.scss';

interface Submission {
  id: string;
  student: { id: string; name: string };
  status: 'ON_TIME' | 'LATE' | 'GRADED' | 'RETURNED';
  submittedAt: string;
  grade?: number;
  isLate: boolean;
}

interface SubmissionsListProps {
  submissions: Submission[];
  onViewSubmission: (submissionId: string) => void;
  onGradeSubmission: (submissionId: string) => void;
  isLoading?: boolean;
  filterStatus?: string;
  onFilterChange?: (status: string) => void;
}

export const SubmissionsList: React.FC<SubmissionsListProps> = ({
  submissions,
  onViewSubmission,
  onGradeSubmission,
  isLoading = false,
  filterStatus,
  onFilterChange,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'grade'>('date');

  const filteredSubmissions = filterStatus
    ? submissions.filter(s => s.status === filterStatus)
    : submissions;

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.student.name.localeCompare(b.student.name);
      case 'date':
        return (
          new Date(b.submittedAt).getTime() -
          new Date(a.submittedAt).getTime()
        );
      case 'grade':
        return (b.grade ?? 0) - (a.grade ?? 0);
      default:
        return 0;
    }
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return 'submissions-list__status-badge--on-time';
      case 'LATE':
        return 'submissions-list__status-badge--late';
      case 'GRADED':
        return 'submissions-list__status-badge--graded';
      case 'RETURNED':
        return 'submissions-list__status-badge--returned';
      default:
        return '';
    }
  };

  const getGradeColor = (grade?: number) => {
    if (!grade) return '';
    if (grade >= 80) return '#3ebb5e';
    if (grade >= 60) return '#ff8f3c';
    return '#ff0003';
  };

  if (isLoading) {
    return (
      <div className="submissions-list submissions-list--loading">
        Loading submissions...
      </div>
    );
  }

  return (
    <div className="submissions-list">
      {/* Toolbar */}
      <div className="submissions-list__toolbar">
        <h3 className="submissions-list__title">Submissions</h3>

        <div className="submissions-list__controls">
          {/* Status Filter */}
          <select
            className="submissions-list__filter"
            value={filterStatus || ''}
            onChange={e => onFilterChange?.(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ON_TIME">On Time</option>
            <option value="LATE">Late</option>
            <option value="GRADED">Graded</option>
          </select>

          {/* Sort By */}
          <select
            className="submissions-list__sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="grade">Sort by Grade</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="submissions-list__stats">
        <div className="submissions-list__stat-item">
          <span className="submissions-list__stat-label">Total:</span>
          <span className="submissions-list__stat-value">{submissions.length}</span>
        </div>
        <div className="submissions-list__stat-item">
          <span className="submissions-list__stat-label">Submitted:</span>
          <span className="submissions-list__stat-value">
            {submissions.filter(s => s.submittedAt).length}
          </span>
        </div>
        <div className="submissions-list__stat-item">
          <span className="submissions-list__stat-label">Graded:</span>
          <span className="submissions-list__stat-value">
            {submissions.filter(s => s.grade !== undefined).length}
          </span>
        </div>
      </div>

      {/* Table */}
      {sortedSubmissions.length > 0 ? (
        <div className="submissions-list__table-wrapper">
          <table className="submissions-list__table">
            <thead>
              <tr>
                <th className="submissions-list__th submissions-list__th--name">
                  Student Name
                </th>
                <th className="submissions-list__th submissions-list__th--date">
                  Submitted
                </th>
                <th className="submissions-list__th submissions-list__th--status">
                  Status
                </th>
                <th className="submissions-list__th submissions-list__th--grade">
                  Grade
                </th>
                <th className="submissions-list__th submissions-list__th--actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSubmissions.map(submission => (
                <tr
                  key={submission.id}
                  className="submissions-list__tr"
                >
                  <td className="submissions-list__td submissions-list__td--name">
                    {submission.student.name}
                  </td>
                  <td className="submissions-list__td submissions-list__td--date">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </td>
                  <td className="submissions-list__td submissions-list__td--status">
                    <span
                      className={`submissions-list__status-badge ${getStatusBadgeClass(
                        submission.status
                      )}`}
                    >
                      {submission.isLate ? '🔴 ' : ''}
                      {submission.status}
                    </span>
                  </td>
                  <td className="submissions-list__td submissions-list__td--grade">
                    {submission.grade !== undefined ? (
                      <span
                        className="submissions-list__grade"
                        style={{ color: getGradeColor(submission.grade) }}
                      >
                        {submission.grade}%
                      </span>
                    ) : (
                      <span className="submissions-list__grade-pending">
                        Not graded
                      </span>
                    )}
                  </td>
                  <td className="submissions-list__td submissions-list__td--actions">
                    <button
                      className="btn btn--sm btn--secondary"
                      onClick={() => onViewSubmission(submission.id)}
                    >
                      View
                    </button>
                    {submission.grade === undefined && (
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={() => onGradeSubmission(submission.id)}
                      >
                        Grade
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="submissions-list__empty">
          <p>No submissions found</p>
        </div>
      )}
    </div>
  );
};
