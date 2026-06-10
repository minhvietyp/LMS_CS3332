import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  Archive,
  BarChart3,
  BookOpen,
  FilePlus2,
  Image as ImageIcon,
  Layers3,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { useAuth } from '../../../../context/AuthContext';
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
} from '../../../../services/api/courseApi';
import type { CourseDetail, CourseListItem, CourseStatus } from '../../../../services/api/courseApi';
import './InstructorCoursesPage.css';

type CourseListStatusFilter = CourseStatus | 'ALL' | 'DELETED';

type CourseFormValues = {
  title: string;
  description?: string;
};

const statusOptions: Array<{ label: string; value: CourseListStatusFilter }> = [
  { label: 'All active', value: 'ALL' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' },
  { label: 'Deleted', value: 'DELETED' },
];

function getStatusColor(status: CourseStatus) {
  if (status === 'PUBLISHED') return 'green';
  if (status === 'ARCHIVED') return 'default';
  return 'blue';
}

function getStatusLabel(status: CourseStatus) {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Draft';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString();
}

function getLessonCount(course?: CourseDetail) {
  return course?.modules.reduce((total, module) => total + module.lessons.length, 0) ?? null;
}

function CourseThumbnail({ course }: { course: Pick<CourseListItem, 'title' | 'thumbnailUrl'> }) {
  if (course.thumbnailUrl) {
    return <Image src={course.thumbnailUrl} alt={course.title} preview={false} className="instructor-course-thumb" />;
  }

  return (
    <div className="instructor-course-thumb instructor-course-thumb--empty" aria-label={`${course.title} thumbnail placeholder`}>
      <ImageIcon size={22} />
    </div>
  );
}

function CourseFormModal({
  open,
  mode,
  course,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  course?: CourseListItem | null;
  onCancel: () => void;
  onSubmit: (values: CourseFormValues, thumbnail: File | null) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [form] = Form.useForm<CourseFormValues>();
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const handleCancel = () => {
    form.resetFields();
    setThumbnail(null);
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Create Course' : 'Edit Course'}
      okText={mode === 'create' ? 'Create course' : 'Save changes'}
      confirmLoading={isSubmitting}
      onCancel={handleCancel}
      onOk={async () => {
        const values = await form.validateFields();
        await onSubmit(values, thumbnail);
        form.resetFields();
        setThumbnail(null);
      }}
      destroyOnHidden
    >
      <Form
        key={`${mode}-${course?.id ?? 'new'}`}
        form={form}
        layout="vertical"
        initialValues={{
          title: course?.title ?? '',
          description: course?.description ?? '',
        }}
      >
        <Form.Item
          label="Title"
          name="title"
          rules={[
            { required: true, message: 'Enter a course title.' },
            { min: 3, message: 'Title must be at least 3 characters.' },
          ]}
        >
          <Input placeholder="Course title" />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={5} placeholder="Explain what learners will achieve in this course." />
        </Form.Item>
        <Form.Item label="Thumbnail">
          <div className="instructor-course-form-thumbnail">
            <CourseThumbnail
              course={{
                title: course?.title ?? 'Course thumbnail',
                thumbnailUrl: course?.thumbnailUrl ?? null,
              }}
            />
            <div className="instructor-course-form-thumbnail__actions">
              <Upload
                accept="image/*"
                maxCount={1}
                beforeUpload={(file) => {
                  setThumbnail(file);
                  return false;
                }}
                onRemove={() => {
                  setThumbnail(null);
                  return true;
                }}
                fileList={thumbnail ? [{ uid: 'thumbnail', name: thumbnail.name, status: 'done' }] : []}
              >
                <Button icon={<UploadIcon size={16} />}>Choose thumbnail</Button>
              </Upload>
              <Typography.Text type="secondary">JPG or PNG. Existing thumbnails stay unchanged if no file is selected.</Typography.Text>
            </div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="instructor-course-summary-card">
      <Typography.Text>{label}</Typography.Text>
      <strong>{value}</strong>
    </Card>
  );
}

export function InstructorCoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseListStatusFilter>('ALL');
  const [editingCourse, setEditingCourse] = useState<CourseListItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const statusParam = statusFilter === 'ALL' || statusFilter === 'DELETED' ? undefined : statusFilter;
  const includeDeleted = statusFilter === 'DELETED';

  const coursesQuery = useQuery({
    queryKey: ['instructor-courses', user?.id, page, pageSize, search, statusFilter],
    queryFn: () =>
      listCoursesRequest({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        status: statusParam,
        instructorId: user?.id,
        includeDeleted,
        deletedOnly: includeDeleted,
      }),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const summaryQuery = useQuery({
    queryKey: ['instructor-courses', user?.id, 'summary'],
    queryFn: async () => {
      const [all, published, draft, archived] = await Promise.all([
        listCoursesRequest({ page: 1, limit: 1, instructorId: user?.id, includeDeleted: false }),
        listCoursesRequest({ page: 1, limit: 1, instructorId: user?.id, status: 'PUBLISHED', includeDeleted: false }),
        listCoursesRequest({ page: 1, limit: 1, instructorId: user?.id, status: 'DRAFT', includeDeleted: false }),
        listCoursesRequest({ page: 1, limit: 1, instructorId: user?.id, status: 'ARCHIVED', includeDeleted: false }),
      ]);

      return {
        total: all.meta?.total ?? all.data.length,
        published: published.meta?.total ?? published.data.length,
        draft: draft.meta?.total ?? draft.data.length,
        archived: archived.meta?.total ?? archived.data.length,
      };
    },
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const visibleCourses = coursesQuery.data?.data ?? [];
  const detailQuery = useQuery({
    queryKey: ['instructor-courses', 'visible-details', visibleCourses.map((course) => course.id).join(',')],
    queryFn: () => Promise.all(visibleCourses.map((course) => getCourseByIdRequest(course.id))),
    enabled: visibleCourses.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const detailMap = useMemo(() => {
    return new Map((detailQuery.data ?? []).map((course) => [course.id, course]));
  }, [detailQuery.data]);

  const refreshCourseData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'instructor'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ mode, course, values, thumbnail }: { mode: 'create' | 'edit'; course?: CourseListItem | null; values: CourseFormValues; thumbnail: File | null }) => {
      if (mode === 'edit' && !course) {
        throw new Error('Course is not available.');
      }
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
      };
      const savedCourse = mode === 'edit' && course ? await updateCourseRequest(course.id, payload) : await createCourseRequest(payload);
      if (thumbnail) {
        await updateCourseThumbnailRequest(savedCourse.id, thumbnail);
      }
      return savedCourse;
    },
    onSuccess: async (_savedCourse, variables) => {
      message.success(variables.mode === 'create' ? 'Course created successfully.' : 'Course updated successfully.');
      setIsCreateOpen(false);
      setEditingCourse(null);
      await refreshCourseData();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to save course.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (course: CourseListItem) => {
      if (course.status === 'PUBLISHED') {
        await archiveCourseRequest(course.id);
        return 'archived';
      }
      await publishCourseRequest(course.id);
      return 'published';
    },
    onSuccess: async (result) => {
      message.success(result === 'archived' ? 'Course archived successfully.' : 'Course published successfully.');
      await refreshCourseData();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to update course status.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCourseRequest,
    onSuccess: async () => {
      message.success('Course deleted successfully.');
      await refreshCourseData();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to delete course.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreCourseRequest,
    onSuccess: async () => {
      message.success('Course restored successfully.');
      await refreshCourseData();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to restore course.');
    },
  });

  return (
    <ClientLayout>
      <ClientPageContainer>
        <section className="instructor-courses-page">
          <div className="instructor-courses-hero">
            <div>
              <Typography.Text className="instructor-courses-eyebrow">Teaching catalog</Typography.Text>
              <Typography.Title level={1}>My Courses</Typography.Title>
              <Typography.Paragraph>
                Manage course information, publishing state, thumbnails, and setup from an instructor-focused workspace.
              </Typography.Paragraph>
            </div>
            <Button type="primary" size="large" icon={<FilePlus2 size={18} />} onClick={() => setIsCreateOpen(true)}>
              Create Course
            </Button>
          </div>

          {summaryQuery.isLoading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} xl={6}><SummaryCard label="Total courses" value={summaryQuery.data?.total ?? 0} /></Col>
              <Col xs={24} sm={12} xl={6}><SummaryCard label="Published" value={summaryQuery.data?.published ?? 0} /></Col>
              <Col xs={24} sm={12} xl={6}><SummaryCard label="Draft" value={summaryQuery.data?.draft ?? 0} /></Col>
              <Col xs={24} sm={12} xl={6}><SummaryCard label="Archived" value={summaryQuery.data?.archived ?? 0} /></Col>
            </Row>
          )}

          <Card className="instructor-courses-toolbar-card">
            <div className="instructor-courses-toolbar">
              <Input
                allowClear
                prefix={<Search size={16} />}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by course title"
              />
              <Select
                value={statusFilter}
                options={statusOptions}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                aria-label="Filter courses by status"
              />
            </div>
          </Card>

          {coursesQuery.isError ? <Alert type="error" showIcon message="Unable to load instructor courses." /> : null}
          {detailQuery.isError ? <Alert type="warning" showIcon message="Courses loaded, but module and lesson counts are unavailable." /> : null}

          <div className="instructor-course-grid">
            {coursesQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card className="instructor-course-card" key={`course-skeleton-${index}`}>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              ))
            ) : visibleCourses.length ? (
              visibleCourses.map((course) => {
                const detail = detailMap.get(course.id);
                const lessonCount = getLessonCount(detail);
                const isMutating =
                  statusMutation.isPending ||
                  deleteMutation.isPending ||
                  restoreMutation.isPending;

                return (
                  <article className="instructor-course-card" key={course.id}>
                    <CourseThumbnail course={course} />
                    <div className="instructor-course-card__body">
                      <div className="instructor-course-card__meta">
                        <Tag color={getStatusColor(course.status)}>{getStatusLabel(course.status)}</Tag>
                        {course.deletedAt ? <Tag color="red">Deleted</Tag> : null}
                        <span>Updated {formatDate(course.updatedAt)}</span>
                      </div>
                      <Typography.Title level={3}>{course.title}</Typography.Title>
                      <Typography.Paragraph>{course.description || 'No course description has been added yet.'}</Typography.Paragraph>
                      <div className="instructor-course-card__counts">
                        {detail ? <span><Layers3 size={15} /> {detail.modules.length} modules</span> : null}
                        {lessonCount !== null ? <span><BookOpen size={15} /> {lessonCount} lessons</span> : null}
                      </div>
                    </div>
                    <div className="instructor-course-card__actions">
                      <Link to={`/instructor/courses/${course.id}`}>View detail</Link>
                      <Link to="/instructor/lessons">Lessons</Link>
                      <Link to={`/courses/${course.id}/analytics`}><BarChart3 size={14} /> Analytics</Link>
                    </div>
                    <div className="instructor-course-card__manage">
                      {!course.deletedAt ? (
                        <>
                          <Button icon={<Pencil size={15} />} onClick={() => setEditingCourse(course)}>Edit</Button>
                          {course.status === 'DRAFT' ? (
                            <Button type="primary" loading={statusMutation.isPending} onClick={() => statusMutation.mutate(course)}>
                              Publish
                            </Button>
                          ) : null}
                          {course.status === 'PUBLISHED' ? (
                            <Button icon={<Archive size={15} />} loading={statusMutation.isPending} onClick={() => statusMutation.mutate(course)}>
                              Archive
                            </Button>
                          ) : null}
                          <Popconfirm
                            title="Delete this course?"
                            description="This will soft delete the course and remove it from active lists."
                            okText="Delete"
                            cancelText="Cancel"
                            onConfirm={() => deleteMutation.mutate(course.id)}
                          >
                            <Button danger icon={<Trash2 size={15} />} loading={isMutating}>
                              Delete
                            </Button>
                          </Popconfirm>
                        </>
                      ) : (
                        <Popconfirm
                          title="Restore this course?"
                          description="This will return the course to active course lists."
                          okText="Restore"
                          cancelText="Cancel"
                          onConfirm={() => restoreMutation.mutate(course.id)}
                        >
                          <Button icon={<RotateCcw size={15} />} loading={restoreMutation.isPending}>
                            Restore
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <Card className="instructor-courses-empty">
                <Empty description="No courses match your current filters.">
                  <Button type="primary" onClick={() => setIsCreateOpen(true)}>Create Course</Button>
                </Empty>
              </Card>
            )}
          </div>

          {coursesQuery.data?.meta ? (
            <div className="instructor-course-pagination">
              <Typography.Text type="secondary">
                Showing {visibleCourses.length} of {coursesQuery.data.meta.total} courses
              </Typography.Text>
              <Pagination
                current={coursesQuery.data.meta.page}
                pageSize={coursesQuery.data.meta.limit}
                total={coursesQuery.data.meta.total}
                pageSizeOptions={['9', '18', '36']}
                showSizeChanger
                onChange={(nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                }}
              />
            </div>
          ) : null}
        </section>

        <CourseFormModal
          open={isCreateOpen}
          mode="create"
          onCancel={() => setIsCreateOpen(false)}
          isSubmitting={saveMutation.isPending}
          onSubmit={async (values, thumbnail) => {
            await saveMutation.mutateAsync({ mode: 'create', values, thumbnail });
          }}
        />
        <CourseFormModal
          open={Boolean(editingCourse)}
          mode="edit"
          course={editingCourse}
          onCancel={() => setEditingCourse(null)}
          isSubmitting={saveMutation.isPending}
          onSubmit={async (values, thumbnail) => {
            await saveMutation.mutateAsync({ mode: 'edit', course: editingCourse, values, thumbnail });
          }}
        />
      </ClientPageContainer>
    </ClientLayout>
  );
}
