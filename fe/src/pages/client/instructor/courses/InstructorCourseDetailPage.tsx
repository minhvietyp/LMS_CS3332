import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  Archive,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Image as ImageIcon,
  Pencil,
  RotateCcw,
  Trash2,
  Upload as UploadIcon,
  UsersRound,
} from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import {
  archiveCourseRequest,
  deleteCourseRequest,
  getCourseByIdRequest,
  publishCourseRequest,
  restoreCourseRequest,
  updateCourseRequest,
  updateCourseThumbnailRequest,
} from '../../../../services/api/courseApi';
import type { CourseDetail, CourseStatus } from '../../../../services/api/courseApi';
import './InstructorCoursesPage.css';

type CourseFormValues = {
  title: string;
  description?: string;
};

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
  return new Date(value).toLocaleString();
}

function CourseBanner({ course }: { course: Pick<CourseDetail, 'thumbnailUrl' | 'title'> }) {
  if (course.thumbnailUrl) {
    return <Image src={course.thumbnailUrl} alt={course.title} preview={false} className="instructor-course-detail-banner" />;
  }

  return (
    <div className="instructor-course-detail-banner instructor-course-detail-banner--empty" aria-label={`${course.title} thumbnail placeholder`}>
      <ImageIcon size={32} />
    </div>
  );
}

function getLessonCount(course: CourseDetail) {
  return course.modules.reduce((total, module) => total + module.lessons.length, 0);
}

function CourseEditModal({
  open,
  course,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  course: CourseDetail;
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
      title="Edit Course"
      okText="Save changes"
      confirmLoading={isSubmitting}
      onCancel={handleCancel}
      onOk={async () => {
        const values = await form.validateFields();
        await onSubmit(values, thumbnail);
        setThumbnail(null);
      }}
      destroyOnHidden
    >
      <Form
        key={course.id}
        form={form}
        layout="vertical"
        initialValues={{ title: course.title, description: course.description ?? '' }}
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
            <CourseBanner course={course} />
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
              <Typography.Text type="secondary">Existing thumbnails stay unchanged if no file is selected.</Typography.Text>
            </div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function InstructorCourseDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const courseQuery = useQuery({
    queryKey: ['instructor-course-detail', id],
    queryFn: () => getCourseByIdRequest(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const course = courseQuery.data;
  const lessonCount = course ? getLessonCount(course) : 0;
  const publishedLessonCount = course
    ? course.modules.reduce((total, module) => total + module.lessons.filter((lesson) => lesson.isPublished).length, 0)
    : 0;

  const setupItems = useMemo(() => {
    if (!course) return [];
    return [
      {
        label: 'Course information',
        complete: Boolean(course.title.trim() && course.description?.trim()),
        note: course.description?.trim() ? 'Title and description are ready.' : 'Add a description for learners.',
      },
      {
        label: 'Modules created',
        complete: course.modules.length > 0,
        note: course.modules.length ? `${course.modules.length} modules available.` : 'Create modules on the lessons page.',
      },
      {
        label: 'Lessons created',
        complete: lessonCount > 0,
        note: lessonCount ? `${lessonCount} lessons available.` : 'Add lessons before publishing the course.',
      },
      {
        label: 'Publishing state',
        complete: course.status === 'PUBLISHED',
        note: `Course is currently ${getStatusLabel(course.status).toLowerCase()}.`,
      },
    ];
  }, [course, lessonCount]);

  const refreshCourse = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['instructor-course-detail', id] }),
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'instructor'] }),
    ]);
  };

  const editMutation = useMutation({
    mutationFn: async ({ values, thumbnail }: { values: CourseFormValues; thumbnail: File | null }) => {
      if (!course) throw new Error('Course is not available.');
      const savedCourse = await updateCourseRequest(course.id, {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
      });
      if (thumbnail) {
        await updateCourseThumbnailRequest(savedCourse.id, thumbnail);
      }
    },
    onSuccess: async () => {
      message.success('Course updated successfully.');
      setIsEditOpen(false);
      await refreshCourse();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to update course.');
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: async (action: 'publish' | 'archive' | 'restore' | 'delete') => {
      if (!course) throw new Error('Course is not available.');
      if (action === 'publish') return publishCourseRequest(course.id);
      if (action === 'archive') return archiveCourseRequest(course.id);
      if (action === 'restore') return restoreCourseRequest(course.id);
      await deleteCourseRequest(course.id);
      return null;
    },
    onSuccess: async (_result, action) => {
      const labels = {
        publish: 'Course published successfully.',
        archive: 'Course archived successfully.',
        restore: 'Course restored successfully.',
        delete: 'Course deleted successfully.',
      };
      message.success(labels[action]);
      await refreshCourse();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to update course.');
    },
  });

  if (!id) {
    return <Navigate to="/instructor/courses" replace />;
  }

  return (
    <ClientLayout>
      <ClientPageContainer>
        <section className="instructor-course-detail-page">
          <Button className="instructor-course-back-button" icon={<ArrowLeft size={16} />}>
            <Link to="/instructor/courses">Back to courses</Link>
          </Button>

          {courseQuery.isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
          {courseQuery.isError ? <Alert type="error" showIcon message="Unable to load course detail." /> : null}
          {!courseQuery.isLoading && !course ? <Empty description="Course not found." /> : null}

          {course ? (
            <>
              <div className="instructor-course-detail-hero">
                <CourseBanner course={course} />
                <div className="instructor-course-detail-hero__copy">
                  <div className="instructor-course-detail-hero__meta">
                    <Tag color={getStatusColor(course.status)}>{getStatusLabel(course.status)}</Tag>
                    {course.deletedAt ? <Tag color="red">Deleted</Tag> : null}
                    <span>Updated {formatDate(course.updatedAt)}</span>
                  </div>
                  <Typography.Title level={1}>{course.title}</Typography.Title>
                  <Typography.Paragraph>{course.description || 'No course description has been added yet.'}</Typography.Paragraph>
                  <div className="instructor-course-detail-hero__actions">
                    {!course.deletedAt ? (
                      <>
                        <Button type="primary" icon={<Pencil size={16} />} onClick={() => setIsEditOpen(true)}>
                          Edit course
                        </Button>
                        <Button icon={<BookOpen size={16} />}><Link to="/instructor/lessons">Manage lessons</Link></Button>
                        <Button icon={<ClipboardList size={16} />}><Link to="/instructor/assessments">Manage assessments</Link></Button>
                        <Button icon={<BarChart3 size={16} />}><Link to={`/courses/${course.id}/analytics`}>View analytics</Link></Button>
                      </>
                    ) : (
                      <Button icon={<RotateCcw size={16} />} loading={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate('restore')}>
                        Restore course
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="instructor-course-detail-grid">
                <Card className="instructor-course-detail-card">
                  <Typography.Text className="instructor-courses-eyebrow">Setup checklist</Typography.Text>
                  <Typography.Title level={3}>Course readiness</Typography.Title>
                  <div className="instructor-course-checklist">
                    {setupItems.map((item) => (
                      <div className="instructor-course-checklist__item" key={item.label}>
                        <span className={item.complete ? 'is-complete' : ''}>
                          <CheckCircle2 size={18} />
                        </span>
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.note}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="instructor-course-detail-card">
                  <Typography.Text className="instructor-courses-eyebrow">Course metadata</Typography.Text>
                  <Typography.Title level={3}>Record details</Typography.Title>
                  <div className="instructor-course-detail-metadata">
                    <div><span>Status</span><strong>{getStatusLabel(course.status)}</strong></div>
                    <div><span>Modules</span><strong>{course.modules.length}</strong></div>
                    <div><span>Lessons</span><strong>{lessonCount}</strong></div>
                    <div><span>Published lessons</span><strong>{publishedLessonCount}</strong></div>
                    <div><span>Created</span><strong>{formatDate(course.createdAt)}</strong></div>
                    <div><span>Updated</span><strong>{formatDate(course.updatedAt)}</strong></div>
                  </div>
                </Card>
              </div>

              <div className="instructor-course-detail-grid instructor-course-detail-grid--wide">
                <Card className="instructor-course-detail-card">
                  <div className="instructor-course-detail-section-header">
                    <div>
                      <Typography.Text className="instructor-courses-eyebrow">Content overview</Typography.Text>
                      <Typography.Title level={3}>Modules and lessons</Typography.Title>
                    </div>
                    <Button><Link to="/instructor/lessons">Open lesson builder</Link></Button>
                  </div>
                  {course.modules.length ? (
                    <div className="instructor-course-module-list">
                      {course.modules
                        .slice()
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((module) => (
                          <article className="instructor-course-module-card" key={module.id}>
                            <header>
                              <div>
                                <strong>{module.title}</strong>
                                <span>{module.lessons.length} lessons</span>
                              </div>
                              <Tag>Module {module.orderIndex}</Tag>
                            </header>
                            {module.lessons.length ? (
                              <div className="instructor-course-lesson-list">
                                {module.lessons
                                  .slice()
                                  .sort((a, b) => a.orderIndex - b.orderIndex)
                                  .map((lesson) => (
                                    <div className="instructor-course-lesson-row" key={lesson.id}>
                                      <span>{lesson.title}</span>
                                      <Tag color={lesson.isPublished ? 'green' : 'default'}>
                                        {lesson.isPublished ? 'Published' : 'Draft'}
                                      </Tag>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <Empty description="No lessons in this module yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                          </article>
                        ))}
                    </div>
                  ) : (
                    <Empty description="No modules have been created for this course yet.">
                      <Button type="primary"><Link to="/instructor/lessons">Create modules and lessons</Link></Button>
                    </Empty>
                  )}
                </Card>

                <div className="instructor-course-side-stack">
                  <Card className="instructor-course-detail-card">
                    <Typography.Text className="instructor-courses-eyebrow">Teaching actions</Typography.Text>
                    <Typography.Title level={3}>Next workspace</Typography.Title>
                    <div className="instructor-course-action-list">
                      <Link to="/instructor/lessons"><BookOpen size={17} /> Manage lessons and modules</Link>
                      <Link to="/instructor/assessments"><ClipboardList size={17} /> Create assessments</Link>
                      <Link to="/instructor/progress"><UsersRound size={17} /> View student progress</Link>
                      <Link to={`/courses/${course.id}/analytics`}><BarChart3 size={17} /> Open course analytics</Link>
                    </div>
                  </Card>

                  <Card className="instructor-course-detail-card instructor-course-detail-card--danger">
                    <Typography.Text className="instructor-courses-eyebrow">Advanced actions</Typography.Text>
                    <Typography.Title level={3}>Lifecycle controls</Typography.Title>
                    <div className="instructor-course-danger-actions">
                      {course.status === 'DRAFT' && !course.deletedAt ? (
                        <Button type="primary" loading={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate('publish')}>
                          Publish course
                        </Button>
                      ) : null}
                      {course.status === 'PUBLISHED' && !course.deletedAt ? (
                        <Button icon={<Archive size={16} />} loading={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate('archive')}>
                          Archive course
                        </Button>
                      ) : null}
                      {!course.deletedAt ? (
                        <Popconfirm
                          title="Delete this course?"
                          description="This will soft delete the course and remove it from active lists."
                          okText="Delete"
                          cancelText="Cancel"
                          onConfirm={() => lifecycleMutation.mutate('delete')}
                        >
                          <Button danger icon={<Trash2 size={16} />} loading={lifecycleMutation.isPending}>Delete course</Button>
                        </Popconfirm>
                      ) : (
                        <Button icon={<RotateCcw size={16} />} loading={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate('restore')}>
                          Restore course
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              <CourseEditModal
                open={isEditOpen}
                course={course}
                isSubmitting={editMutation.isPending}
                onCancel={() => setIsEditOpen(false)}
                onSubmit={(values, thumbnail) => editMutation.mutateAsync({ values, thumbnail })}
              />
            </>
          ) : null}
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}
