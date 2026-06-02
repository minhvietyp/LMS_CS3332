import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Eye,
  Image as ImageIcon,
  Pencil,
  RefreshCw,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { canAccess, PERMISSIONS } from '../../../../utils/rbac';
import {
  archiveCourseRequest,
  createCourseRequest,
  deleteCourseRequest,
  getCourseByIdRequest,
  listCoursesRequest,
  publishCourseRequest,
  restoreCourseRequest,
  updateCourseRequest,
  updateCourseThumbnailRequest,
  type CourseDetail,
  type CourseListItem,
  type CourseStatus,
} from '../../../../services/api/courseApi';
import './index.css';

type CourseFormValues = {
  title: string;
  description?: string;
};

type CourseListStatusFilter = CourseStatus | 'ALL' | 'DELETED';

type CourseManagementProps = {
  basePath?: string;
};

const statusOptions: Array<{ label: string; value: CourseListStatusFilter }> = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
  { label: 'Deleted', value: 'DELETED' },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function CourseStatusTag({ status }: { status: CourseStatus }) {
  const color = status === 'PUBLISHED' ? 'green' : status === 'ARCHIVED' ? 'default' : 'blue';
  return <Tag color={color}>{status}</Tag>;
}

function CourseThumbnail({ course }: { course: Pick<CourseListItem, 'thumbnailUrl' | 'title'> }) {
  return course.thumbnailUrl ? (
    <Image
      src={course.thumbnailUrl}
      alt={course.title}
      width={64}
      height={42}
      className="admin-course-thumbnail"
      preview={false}
    />
  ) : (
    <div className="admin-course-thumbnail admin-course-thumbnail--placeholder">
      <ImageIcon size={18} />
    </div>
  );
}

function CourseFormFields({
  form,
  initialCourse,
  selectedThumbnail,
  onThumbnailChange,
}: {
  form: ReturnType<typeof Form.useForm<CourseFormValues>>[0];
  initialCourse?: Pick<CourseListItem, 'title' | 'description' | 'thumbnailUrl'> | null;
  selectedThumbnail: File | null;
  onThumbnailChange: (file: File | null) => void;
}) {
  return (
    <Form layout="vertical" form={form} initialValues={{ title: '', description: '' }}>
      <div className="admin-course-form">
        <Card className="course-management-card admin-course-form__main" bordered={false}>
          <Typography.Title level={4}>Course Information</Typography.Title>
          <Typography.Paragraph type="secondary" className="admin-course-form__intro">
            Capture the core learning details that appear across the admin course catalog.
          </Typography.Paragraph>

          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Enter a course title.' },
              { min: 3, message: 'Title must be at least 3 characters.' },
            ]}
          >
            <Input placeholder="Introduction to React" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={7} placeholder="Explain what learners will achieve in this course." />
          </Form.Item>

          <Form.Item label="Thumbnail">
            <div className="admin-course-form__thumbnail-panel">
              <CourseThumbnail
                course={{
                  title: initialCourse?.title ?? form.getFieldValue('title') ?? 'Course thumbnail',
                  thumbnailUrl: initialCourse?.thumbnailUrl ?? null,
                }}
              />
              <div className="admin-course-form__thumbnail-actions">
                <Upload
                  accept="image/*"
                  maxCount={1}
                  beforeUpload={(file) => {
                    onThumbnailChange(file);
                    return false;
                  }}
                  onRemove={() => {
                    onThumbnailChange(null);
                    return true;
                  }}
                  fileList={selectedThumbnail ? [{ uid: 'thumbnail', name: selectedThumbnail.name, status: 'done' }] : []}
                >
                  <Button icon={<UploadIcon size={16} />}>Choose thumbnail</Button>
                </Upload>
                <Typography.Text type="secondary">
                  JPG or PNG. If no image is selected, the course keeps its current placeholder or thumbnail.
                </Typography.Text>
                {selectedThumbnail ? <Typography.Text>{selectedThumbnail.name}</Typography.Text> : null}
              </div>
            </div>
          </Form.Item>
        </Card>
      </div>
    </Form>
  );
}

export function CourseManagementForm({
  mode,
  courseId,
  basePath = '/admin/courses',
}: {
  mode: 'create' | 'edit';
  courseId?: string;
  basePath?: string;
}) {
  const [form] = Form.useForm<CourseFormValues>();
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canCreateCourses = canAccess(user?.role, PERMISSIONS.COURSE_CREATE);
  const canUpdateCourses = canAccess(user?.role, PERMISSIONS.COURSE_UPDATE);

  useEffect(() => {
    if (mode !== 'edit' || !courseId) {
      form.setFieldsValue({ title: '', description: '' });
      setCourse(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    void getCourseByIdRequest(courseId)
      .then((result) => {
        if (!isActive) {
          return;
        }

        setCourse(result);
        form.setFieldsValue({
          title: result.title,
          description: result.description ?? '',
        });
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load course details.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [courseId, form, mode]);

  if ((mode === 'create' && !canCreateCourses) || (mode === 'edit' && !canUpdateCourses)) {
    return <Navigate to={basePath} replace />;
  }

  const initialCourse = course
    ? course
    : {
        title: '',
        description: '',
        thumbnailUrl: null,
      };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const values = await form.validateFields();
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
      };

      const savedCourse =
        mode === 'edit' && courseId
          ? await updateCourseRequest(courseId, payload)
          : await createCourseRequest(payload);

      if (selectedThumbnail) {
        await updateCourseThumbnailRequest(savedCourse.id, selectedThumbnail);
      }

      message.success(mode === 'edit' ? 'Course updated successfully.' : 'Course created successfully.');
      navigate(`${basePath}/${savedCourse.id}`);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(mode === 'edit' ? 'Failed to update course.' : 'Failed to create course.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-course-editor">
      <div className="admin-course-editor__toolbar">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(mode === 'edit' && courseId ? `${basePath}/${courseId}` : basePath)}>
          Back
        </Button>
        <Space>
          <Button onClick={() => navigate(mode === 'edit' && courseId ? `${basePath}/${courseId}` : basePath)}>Cancel</Button>
          <Button type="primary" loading={isSubmitting} onClick={() => void handleSubmit()}>
            {mode === 'edit' ? 'Save changes' : 'Create course'}
          </Button>
        </Space>
      </div>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      {isLoading ? (
        <Card className="course-management-card" bordered={false}>
          <div className="admin-courses-page__state">
            <Spin />
          </div>
        </Card>
      ) : (
        <CourseFormFields
          form={form}
          initialCourse={initialCourse}
          selectedThumbnail={selectedThumbnail}
          onThumbnailChange={setSelectedThumbnail}
        />
      )}
    </section>
  );
}

export function CourseManagement({ basePath = '/admin/courses' }: CourseManagementProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

  const canViewCourses = canAccess(user?.role, PERMISSIONS.COURSE_READ);
  const canCreateCourses = canAccess(user?.role, PERMISSIONS.COURSE_CREATE);
  const canManageCourse = (course: CourseListItem) =>
    (canAccess(user?.role, PERMISSIONS.COURSE_UPDATE) || canAccess(user?.role, PERMISSIONS.COURSE_DELETE)) &&
    (user?.role === 'ADMIN' || course.instructorId === user?.id);
  const canRestoreCourse = (course: CourseListItem) =>
    canAccess(user?.role, PERMISSIONS.COURSE_RESTORE) &&
    Boolean(course.deletedAt) &&
    (user?.role === 'ADMIN' || course.instructorId === user?.id);
  const canPublishCourse = (course: CourseListItem) => canManageCourse(course) && course.status === 'DRAFT';
  const canArchiveCourse = (course: CourseListItem) => canManageCourse(course) && course.status === 'PUBLISHED' && !course.deletedAt;

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? '10'));
  const search = searchParams.get('search') ?? '';
  const statusFilter = (searchParams.get('status') as CourseListStatusFilter | null) ?? 'ALL';
  const statusParam = statusFilter === 'ALL' || statusFilter === 'DELETED' ? undefined : statusFilter;

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === search) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      if (trimmed) {
        nextParams.set('search', trimmed);
      } else {
        nextParams.delete('search');
      }
      nextParams.set('page', '1');
      setSearchParams(nextParams, { replace: true });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search, searchInput, searchParams, setSearchParams]);

  const loadCourses = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await listCoursesRequest({
        includeDeleted: statusFilter === 'DELETED',
        deletedOnly: statusFilter === 'DELETED',
        page,
        limit,
        search: search || undefined,
        status: statusParam,
      });
      setCourses(result.data);
      setMeta(result.meta ?? { page, limit, total: result.data.length, totalPages: 1 });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load courses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewCourses) {
      void loadCourses();
    } else {
      setIsLoading(false);
    }
  }, [canViewCourses, limit, page, search, statusFilter, statusParam]);

  const updateQuery = (patch: Record<string, string | undefined>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  const handleDelete = async (courseId: string) => {
    setIsMutating(courseId);
    setErrorMessage(null);

    try {
      await deleteCourseRequest(courseId);
      message.success('Course deleted successfully.');
      await loadCourses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete course.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleRestore = async (courseId: string) => {
    setIsMutating(courseId);
    setErrorMessage(null);

    try {
      await restoreCourseRequest(courseId);
      message.success('Course restored successfully.');
      await loadCourses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to restore course.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleStatusAction = async (course: CourseListItem) => {
    setIsMutating(course.id);
    setErrorMessage(null);

    try {
      if (course.status === 'PUBLISHED') {
        await archiveCourseRequest(course.id);
        message.success('Course archived successfully.');
      } else {
        await publishCourseRequest(course.id);
        message.success('Course published successfully.');
      }

      await loadCourses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update course status.');
    } finally {
      setIsMutating(null);
    }
  };

  const columns = useMemo<ColumnsType<CourseListItem>>(
    () => [
      {
        title: 'Thumbnail',
        key: 'thumbnail',
        width: 96,
        render: (_, record) => <CourseThumbnail course={record} />,
      },
      {
        title: 'ID',
        key: 'id',
        width: 220,
        render: (_, record) => <Typography.Text code>{record.id}</Typography.Text>,
      },
      {
        title: 'Title',
        key: 'title',
        render: (_, record) => (
          <button
            type="button"
            className="admin-courses-table__title-button"
            onClick={() => navigate(`${basePath}/${record.id}`)}
          >
            <Typography.Text strong>{record.title}</Typography.Text>
            <Typography.Text type="secondary" className="admin-courses-table__description">
              {record.description || 'No description yet.'}
            </Typography.Text>
          </button>
        ),
      },
      {
        title: 'Instructor',
        key: 'instructor',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <span>{record.instructor?.name ?? 'Unassigned'}</span>
            <Typography.Text type="secondary">{record.instructorId}</Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: CourseStatus) => <CourseStatusTag status={value} />,
      },
      {
        title: 'Created',
        key: 'createdAt',
        render: (_, record) => formatDateTime(record.createdAt),
      },
      {
        title: 'Updated',
        key: 'updatedAt',
        render: (_, record) => formatDateTime(record.updatedAt),
      },
      {
        title: 'Deleted At',
        key: 'deletedAt',
        render: (_, record) => (record.deletedAt ? formatDateTime(record.deletedAt) : 'Active'),
      },
      {
        title: 'Deleted By',
        key: 'deletedBy',
        render: (_, record) => record.deletedBy ?? 'Not available',
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'right',
        render: (_, record) => (
          <Space wrap>
            <Tooltip title="View course">
              <Button
                size="small"
                icon={<Eye size={14} />}
                onClick={() => navigate(`${basePath}/${record.id}`)}
              >
                View
              </Button>
            </Tooltip>
            {canManageCourse(record) && !record.deletedAt ? (
              <Button
                size="small"
                icon={<Pencil size={14} />}
                onClick={() => navigate(`${basePath}/${record.id}/edit`)}
              >
                Edit
              </Button>
            ) : null}
            {canPublishCourse(record) ? (
              <Button size="small" onClick={() => void handleStatusAction(record)} loading={isMutating === record.id}>
                Publish
              </Button>
            ) : null}
            {canArchiveCourse(record) ? (
              <Button
                size="small"
                icon={<Archive size={14} />}
                onClick={() => void handleStatusAction(record)}
                loading={isMutating === record.id}
              >
                Archive
              </Button>
            ) : null}
            {canManageCourse(record) && !record.deletedAt ? (
              <Popconfirm
                title="Delete this course?"
                description="This will soft delete the course and remove it from active lists."
                onConfirm={() => void handleDelete(record.id)}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button danger size="small" icon={<Trash2 size={14} />} loading={isMutating === record.id}>
                  Delete
                </Button>
              </Popconfirm>
            ) : null}
            {canRestoreCourse(record) ? (
              <Popconfirm
                title="Restore this course?"
                description="This will return the course to active course management lists."
                onConfirm={() => void handleRestore(record.id)}
                okText="Restore"
                cancelText="Cancel"
              >
                <Button size="small" loading={isMutating === record.id}>
                  Restore
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [basePath, isMutating, navigate],
  );

  if (!canViewCourses) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <section className="admin-courses-page">
        <div className="admin-courses-page__toolbar">
          <div className="admin-courses-page__filters">
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search courses..."
              className="admin-courses-page__search"
            />
            <Select
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => updateQuery({ status: value === 'ALL' ? undefined : String(value), page: '1' })}
              className="admin-courses-page__status-filter"
            />
          </div>

          <Space>
            <Button icon={<RefreshCw size={16} />} onClick={() => void loadCourses()} loading={isLoading}>
              Refresh
            </Button>
            {canCreateCourses ? (
              <Button
                type="primary"
                icon={<BookOpen size={16} />}
                onClick={() => navigate(`${basePath}/create`)}
              >
                New course
              </Button>
            ) : null}
          </Space>
        </div>

        {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

        <Card className="course-management-card" bordered={false}>
          <Table<CourseListItem>
            rowKey="id"
            columns={columns}
            dataSource={courses}
            loading={isLoading}
            pagination={false}
            locale={{
              emptyText: isLoading ? <Spin size="small" /> : <Empty description="No courses found. Try adjusting your search or filters." />,
            }}
            className="admin-courses-table"
            scroll={{ x: 1550 }}
          />

          <div className="admin-courses-page__footer">
            <Typography.Text type="secondary">
              Showing {courses.length} of {meta.total} courses
            </Typography.Text>
            <Pagination
              current={meta.page}
              pageSize={meta.limit}
              total={meta.total}
              pageSizeOptions={['10', '20', '50']}
              showSizeChanger
              onChange={(nextPage, nextPageSize) =>
                updateQuery({
                  page: String(nextPage),
                  limit: String(nextPageSize),
                })
              }
            />
          </div>
        </Card>
      </section>

    </>
  );
}

export function CourseManagementDetail({
  courseId,
  basePath = '/admin/courses',
}: {
  courseId: string;
  basePath?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canViewCourses = canAccess(user?.role, PERMISSIONS.COURSE_READ);
  const canManageCourse = course
    ? (canAccess(user?.role, PERMISSIONS.COURSE_UPDATE) ||
        canAccess(user?.role, PERMISSIONS.COURSE_DELETE) ||
        canAccess(user?.role, PERMISSIONS.COURSE_RESTORE)) &&
      (user?.role === 'ADMIN' || course.instructorId === user?.id)
    : false;

  const loadCourse = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await getCourseByIdRequest(courseId);
      setCourse(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load course details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewCourses) {
      void loadCourse();
    } else {
      setIsLoading(false);
    }
  }, [canViewCourses, courseId]);

  const handleDelete = async () => {
    if (!course) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      await deleteCourseRequest(course.id);
      message.success('Course deleted successfully.');
      navigate(basePath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete course.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRestore = async () => {
    if (!course) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      await restoreCourseRequest(course.id);
      message.success('Course restored successfully.');
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to restore course.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleLifecycleAction = async (nextAction: 'publish' | 'archive') => {
    if (!course) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      if (nextAction === 'publish') {
        await publishCourseRequest(course.id);
        message.success('Course published successfully.');
      } else {
        await archiveCourseRequest(course.id);
        message.success('Course archived successfully.');
      }

      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update course status.');
    } finally {
      setIsMutating(false);
    }
  };

  if (!canViewCourses) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <Card className="course-management-card" bordered={false}>
        <div className="admin-courses-page__state">
          <Spin />
        </div>
      </Card>
    );
  }

  if (errorMessage) {
    return <Alert type="error" showIcon message={errorMessage} />;
  }

  if (!course) {
    return <Empty description="Course not found." />;
  }

  return (
    <>
      <section className="admin-course-detail">
        <div className="admin-course-detail__header">
          <div className="admin-course-detail__overview">
            <CourseThumbnail course={course} />
            <div className="admin-course-detail__summary">
              <Typography.Title level={2} className="admin-course-detail__title">
                {course.title}
              </Typography.Title>
              <Typography.Paragraph className="admin-course-detail__description">
                {course.description || 'No description provided for this course yet.'}
              </Typography.Paragraph>
              <Space wrap>
                <CourseStatusTag status={course.status} />
                <Typography.Text type="secondary">
                  Instructor: {course.instructor?.name ?? course.instructorId}
                </Typography.Text>
              </Space>
            </div>
          </div>

          <Space wrap className="admin-course-detail__actions">
            {canManageCourse && !course.deletedAt ? (
              <Button icon={<Pencil size={16} />} onClick={() => navigate(`${basePath}/${course.id}/edit`)}>
                Edit
              </Button>
            ) : null}
            {canManageCourse && course.status === 'DRAFT' && !course.deletedAt ? (
              <Button type="primary" onClick={() => void handleLifecycleAction('publish')} loading={isMutating}>
                Publish
              </Button>
            ) : null}
            {canManageCourse && course.status === 'PUBLISHED' && !course.deletedAt ? (
              <Button onClick={() => void handleLifecycleAction('archive')} loading={isMutating}>
                Archive
              </Button>
            ) : null}
            {canManageCourse && !course.deletedAt ? (
              <Popconfirm
                title="Delete this course?"
                description="This will soft delete the course and remove it from active lists."
                onConfirm={() => void handleDelete()}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button danger icon={<Trash2 size={16} />} loading={isMutating}>
                  Delete
                </Button>
              </Popconfirm>
            ) : null}
            {canManageCourse && course.deletedAt ? (
              <Popconfirm
                title="Restore this course?"
                description="This will return the course to active course management lists."
                onConfirm={() => void handleRestore()}
                okText="Restore"
                cancelText="Cancel"
              >
                <Button loading={isMutating}>Restore</Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>

        <div className="admin-course-detail__grid">
          <Card className="course-management-card admin-course-detail__card" bordered={false}>
            <Typography.Title level={4}>Course Metadata</Typography.Title>
            <div className="admin-course-detail__metadata">
              <div className="admin-course-detail__metadata-row">
                <span>Status</span>
                <CourseStatusTag status={course.status} />
              </div>
              <div className="admin-course-detail__metadata-row">
                <span>Instructor</span>
                <strong>{course.instructor?.name ?? course.instructorId}</strong>
              </div>
              <div className="admin-course-detail__metadata-row">
                <span>Created</span>
                <strong>{formatDateTime(course.createdAt)}</strong>
              </div>
              <div className="admin-course-detail__metadata-row">
                <span>Updated</span>
                <strong>{formatDateTime(course.updatedAt)}</strong>
              </div>
              <div className="admin-course-detail__metadata-row">
                <span>Deleted</span>
                <strong>{course.deletedAt ? formatDateTime(course.deletedAt) : 'Active'}</strong>
              </div>
            </div>
          </Card>

          <Card className="course-management-card admin-course-detail__card" bordered={false}>
            <Typography.Title level={4}>Modules</Typography.Title>
            {course.modules.length ? (
              <div className="admin-course-detail__modules">
                {course.modules
                  .slice()
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((module) => (
                    <article key={module.id} className="admin-course-detail__module">
                      <header className="admin-course-detail__module-header">
                        <Typography.Text strong>{module.title}</Typography.Text>
                        <Typography.Text type="secondary">Module {module.orderIndex}</Typography.Text>
                      </header>
                      {module.lessons.length ? (
                        <ol className="admin-course-detail__lessons">
                          {module.lessons
                            .slice()
                            .sort((a, b) => a.orderIndex - b.orderIndex)
                            .map((lesson) => (
                              <li key={lesson.id} className="admin-course-detail__lesson">
                                <div>
                                  <Typography.Text>{lesson.title}</Typography.Text>
                                  <Typography.Text type="secondary">
                                    Lesson {lesson.orderIndex}
                                  </Typography.Text>
                                </div>
                                <Tag color={lesson.isPublished ? 'green' : 'default'}>
                                  {lesson.isPublished ? 'Published' : 'Draft'}
                                </Tag>
                              </li>
                            ))}
                        </ol>
                      ) : (
                        <Empty description="No lessons in this module yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </article>
                  ))}
              </div>
            ) : (
              <Empty description="No modules have been created for this course yet." />
            )}
          </Card>
        </div>
      </section>

    </>
  );
}

