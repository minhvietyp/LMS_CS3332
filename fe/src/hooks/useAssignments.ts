import { useState, useEffect, useCallback } from 'react';
import { assignmentAPIClient } from '../services/assignment.service';

interface UseAssignmentsOptions {
  courseId?: string;
  autoFetch?: boolean;
}

export const useAssignments = ({
  courseId,
  autoFetch = true,
}: UseAssignmentsOptions) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await assignmentAPIClient.listByCourse(courseId);
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (autoFetch && courseId) {
      fetchAssignments();
    }
  }, [courseId, autoFetch, fetchAssignments]);

  return { assignments, loading, error, refetch: fetchAssignments };
};

interface UseAssignmentOptions {
  assignmentId?: string;
  autoFetch?: boolean;
}

export const useAssignment = ({
  assignmentId,
  autoFetch = true,
}: UseAssignmentOptions) => {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = useCallback(async () => {
    if (!assignmentId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await assignmentAPIClient.getAssignment(assignmentId);
      setAssignment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (autoFetch && assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId, autoFetch, fetchAssignment]);

  return { assignment, loading, error, refetch: fetchAssignment };
};

interface UseSubmissionsOptions {
  assignmentId?: string;
  autoFetch?: boolean;
}

export const useSubmissions = ({
  assignmentId,
  autoFetch = true,
}: UseSubmissionsOptions) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!assignmentId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await assignmentAPIClient.listSubmissionsByAssignment(
        assignmentId
      );
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (autoFetch && assignmentId) {
      fetchSubmissions();
    }
  }, [assignmentId, autoFetch, fetchSubmissions]);

  return { submissions, loading, error, refetch: fetchSubmissions };
};

interface UseStudentSubmissionsOptions {
  courseId?: string;
  autoFetch?: boolean;
}

export const useStudentSubmissions = ({
  courseId,
  autoFetch = true,
}: UseStudentSubmissionsOptions) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await assignmentAPIClient.listStudentSubmissions(courseId);
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (autoFetch && courseId) {
      fetchSubmissions();
    }
  }, [courseId, autoFetch, fetchSubmissions]);

  return { submissions, loading, error, refetch: fetchSubmissions };
};

interface UseSubmissionOptions {
  submissionId?: string;
  autoFetch?: boolean;
}

export const useSubmission = ({
  submissionId,
  autoFetch = true,
}: UseSubmissionOptions) => {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await assignmentAPIClient.getSubmission(submissionId);
      setSubmission(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (autoFetch && submissionId) {
      fetchSubmission();
    }
  }, [submissionId, autoFetch, fetchSubmission]);

  return { submission, loading, error, refetch: fetchSubmission };
};
