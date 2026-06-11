import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeft,
  FilePlus2,
  Layers3,
  Link2,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { useAuth } from '../../../../context/useAuth';
import { listCoursesRequest } from '../../../../services/api/courseApi';
import type { CourseStatus } from '../../../../services/api/courseApi';
import {
  createLessonMaterialRequest,
  createLessonRequest,
  createModuleRequest,
  deleteLessonMaterialRequest,
  deleteLessonRequest,
  deleteModuleRequest,
  listCourseModulesRequest,
  listLessonMaterialsRequest,
  updateLessonRequest,
  updateModuleRequest,
  uploadLessonMaterialRequest,
} from '../../../../services/api/lessonApi';
import type { LessonListItem, LessonMaterialItem, MaterialPayload, ModuleWithLessons } from '../../../../services/api/lessonApi';
import './InstructorLessonsPage.css';

type ModuleFormValues = {
  title: string;
  orderIndex?: number;
};

type LessonFormValues = {
  moduleId: string;
  title: string;
  videoUrl?: string;
  orderIndex?: number;
};

type MaterialFormValues = {
  title: string;
  type: MaterialPayload['type'];
  url?: string;
};

type LessonWithModule = LessonListItem & {
  moduleTitle: string;
};

const materialTypeOptions: Array<{ label: string; value: MaterialPayload['type'] }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'slide', label: 'Slide deck' },
  { value: 'video', label: 'Video' },
  { value: 'reading', label: 'Reading' },
  { value: 'link', label: 'Link' },
];

const materialUploadAccept =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.mp4,.webm,.mov,.mkv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip,image/jpeg,image/png,video/mp4,video/webm,video/quicktime,video/x-matroska';

function isVideoMaterial(material: Pick<LessonMaterialItem, 'type' | 'url'>) {
  return material.type === 'video' || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(material.url);
}

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

function sortModules(modules: ModuleWithLessons[]) {
  return modules.slice().sort((left, right) => left.orderIndex - right.orderIndex);
}

function sortLessons(lessons: LessonListItem[]) {
  return lessons.slice().sort((left, right) => left.orderIndex - right.orderIndex);
}

function getMaterialCount(modules: ModuleWithLessons[]) {
  return modules.reduce(
    (total, module) => total + module.lessons.reduce((lessonTotal, lesson) => lessonTotal + (lesson.materials?.length ?? 0), 0),
    0,
  );
}

function ModuleModal({
  open,
  module,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  module: ModuleWithLessons | null;
  onCancel: () => void;
  onSubmit: (values: ModuleFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [form] = Form.useForm<ModuleFormValues>();

  return (
    <Modal
      open={open}
      title={module ? 'Edit module' : 'Create module'}
      okText={module ? 'Save module' : 'Create module'}
      confirmLoading={isSubmitting}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={async () => {
        const values = await form.validateFields();
        await onSubmit(values);
        form.resetFields();
      }}
      destroyOnHidden
    >
      <Form key={module?.id ?? 'new-module'} form={form} layout="vertical" initialValues={{ title: module?.title ?? '', orderIndex: module?.orderIndex }}>
        <Form.Item
          label="Module title"
          name="title"
          rules={[
            { required: true, message: 'Enter a module title.' },
            { min: 2, message: 'Title must be at least 2 characters.' },
          ]}
        >
          <Input placeholder="Module 1: Getting started" />
        </Form.Item>
        <Form.Item label="Order index" name="orderIndex">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function LessonModal({
  open,
  lesson,
  selectedModuleId,
  moduleOptions,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  lesson: LessonWithModule | null;
  selectedModuleId?: string;
  moduleOptions: Array<{ label: string; value: string }>;
  onCancel: () => void;
  onSubmit: (values: LessonFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [form] = Form.useForm<LessonFormValues>();

  return (
    <Modal
      open={open}
      title={lesson ? 'Edit lesson' : 'Create lesson'}
      okText={lesson ? 'Save lesson' : 'Create lesson'}
      confirmLoading={isSubmitting}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={async () => {
        const values = await form.validateFields();
        await onSubmit(values);
        form.resetFields();
      }}
      destroyOnHidden
    >
      <Form
        key={lesson?.id ?? `new-lesson-${selectedModuleId ?? 'none'}`}
        form={form}
        layout="vertical"
        initialValues={{
          moduleId: lesson?.moduleId ?? selectedModuleId,
          title: lesson?.title ?? '',
          videoUrl: lesson?.videoUrl ?? undefined,
          orderIndex: lesson?.orderIndex,
        }}
      >
        <Form.Item label="Module" name="moduleId" rules={[{ required: true, message: 'Select a module.' }]}>
          <Select options={moduleOptions} placeholder="Select module" />
        </Form.Item>
        <Form.Item
          label="Lesson title"
          name="title"
          rules={[
            { required: true, message: 'Enter a lesson title.' },
            { min: 2, message: 'Title must be at least 2 characters.' },
          ]}
        >
          <Input placeholder="Lesson 1: Introduction" />
        </Form.Item>
        <Form.Item label="Video URL" name="videoUrl" rules={[{ type: 'url', message: 'Enter a valid URL.' }]}>
          <Input placeholder="https://example.com/video" />
        </Form.Item>
        <Form.Item label="Order index" name="orderIndex">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function MaterialsModal({
  lesson,
  materials,
  isLoading,
  isSubmitting,
  materialFile,
  onFileChange,
  onCancel,
  onSubmit,
  onDelete,
}: {
  lesson: LessonWithModule | null;
  materials: LessonMaterialItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  materialFile: File | null;
  onFileChange: (file: File | null) => void;
  onCancel: () => void;
  onSubmit: (values: MaterialFormValues) => Promise<void>;
  onDelete: (materialId: string) => void;
}) {
  const [form] = Form.useForm<MaterialFormValues>();

  return (
    <Modal
      open={Boolean(lesson)}
      title={lesson ? `Materials: ${lesson.title}` : 'Lesson materials'}
      okText="Save material"
      confirmLoading={isSubmitting}
      onCancel={() => {
        form.resetFields();
        onFileChange(null);
        onCancel();
      }}
      onOk={async () => {
        const values = await form.validateFields();
        await onSubmit(values);
        form.resetFields();
      }}
      width={880}
      destroyOnHidden
    >
      <div className="lesson-builder-material-modal">
        <Form form={form} layout="vertical" initialValues={{ title: '', type: 'pdf' }}>
          <Form.Item
            label="Material title"
            name="title"
            rules={[
              { required: true, message: 'Enter material title.' },
              { min: 2, message: 'Title must be at least 2 characters.' },
            ]}
          >
            <Input placeholder="Lesson handout" />
          </Form.Item>
          <Form.Item label="Type" name="type" rules={[{ required: true, message: 'Select a material type.' }]}>
            <Select options={materialTypeOptions} />
          </Form.Item>
          <Form.Item label="Upload file" extra="If no file is selected, the URL field will be used instead.">
            <Upload
              accept={materialUploadAccept}
              maxCount={1}
              beforeUpload={(file) => {
                onFileChange(file);
                if (file.type.startsWith('video/')) {
                  form.setFieldValue('type', 'video');
                }
                return false;
              }}
              onRemove={() => {
                onFileChange(null);
                return true;
              }}
              fileList={materialFile ? [{ uid: 'material-file', name: materialFile.name, status: 'done' }] : []}
            >
              <Button icon={<UploadIcon size={16} />}>Choose file</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="Or material URL" name="url" rules={[{ type: 'url', message: 'Enter a valid URL.' }]}>
            <Input placeholder="https://example.com/lesson-material" />
          </Form.Item>
        </Form>

        <div className="lesson-builder-material-list">
          <Typography.Text className="instructor-lessons-eyebrow">Attached materials</Typography.Text>
          {isLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : null}
          {!isLoading && materials.length ? (
            materials.map((material) => (
              <article className="lesson-builder-material-item" key={material.id}>
                <div>
                  <strong>{material.title}</strong>
                  <span>{material.type.toUpperCase()}</span>
                  {isVideoMaterial(material) ? (
                    <video className="lesson-builder-material-item__video" src={material.url} controls preload="metadata" />
                  ) : null}
                </div>
                <div className="lesson-builder-material-item__actions">
                  <a href={material.url} target="_blank" rel="noreferrer">
                    <Link2 size={15} /> Open
                  </a>
                  <Popconfirm
                    title="Delete this material?"
                    description="This removes the material from the lesson."
                    okText="Delete"
                    cancelText="Cancel"
                    onConfirm={() => onDelete(material.id)}
                  >
                    <Button danger size="small" icon={<Trash2 size={14} />}>Delete</Button>
                  </Popconfirm>
                </div>
              </article>
            ))
          ) : null}
          {!isLoading && !materials.length ? (
            <Empty description="Attach files or links to support this lesson." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export function InstructorLessonsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>();
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithLessons | null>(null);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonWithModule | null>(null);
  const [materialsLesson, setMaterialsLesson] = useState<LessonWithModule | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['instructor-lessons', 'courses', user?.id],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 100, includeDeleted: false });
      return response.data.filter((course) => course.instructorId === user?.id);
    },
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courses = coursesQuery.data ?? [];
  const effectiveCourseId =
    selectedCourseId && courses.some((course) => course.id === selectedCourseId)
      ? selectedCourseId
      : courses[0]?.id;
  const selectedCourse = courses.find((course) => course.id === effectiveCourseId);

  const modulesQuery = useQuery({
    queryKey: ['instructor-lessons', 'modules', effectiveCourseId],
    queryFn: () => listCourseModulesRequest(effectiveCourseId!),
    enabled: Boolean(effectiveCourseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const modules = useMemo(() => sortModules(modulesQuery.data ?? []), [modulesQuery.data]);
  const effectiveModuleId =
    selectedModuleId && modules.some((module) => module.id === selectedModuleId)
      ? selectedModuleId
      : modules[0]?.id;
  const selectedModule = modules.find((module) => module.id === effectiveModuleId);
  const selectedLessons = selectedModule ? sortLessons(selectedModule.lessons) : [];
  const moduleOptions = modules.map((module) => ({ value: module.id, label: `${module.orderIndex}. ${module.title}` }));
  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
  const loadedMaterialCount = getMaterialCount(modules);
  const publishedLessons = modules.reduce(
    (total, module) => total + module.lessons.filter((lesson) => lesson.isPublished).length,
    0,
  );

  const materialsQuery = useQuery({
    queryKey: ['instructor-lessons', 'materials', materialsLesson?.id],
    queryFn: () => listLessonMaterialsRequest(materialsLesson!.id),
    enabled: Boolean(materialsLesson?.id),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const invalidateBuilder = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['instructor-lessons'] }),
      queryClient.invalidateQueries({ queryKey: ['instructor-course-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'instructor'] }),
    ]);
  };

  const moduleMutation = useMutation({
    mutationFn: async ({ module, values }: { module: ModuleWithLessons | null; values: ModuleFormValues }) => {
      if (!effectiveCourseId) throw new Error('Select a course before saving modules.');
      const payload = { title: values.title.trim(), orderIndex: values.orderIndex };
      if (module) {
        await updateModuleRequest(module.id, payload);
      } else {
        await createModuleRequest(effectiveCourseId, payload);
      }
    },
    onSuccess: async (_result, variables) => {
      message.success(variables.module ? 'Module updated successfully.' : 'Module created successfully.');
      setModuleModalOpen(false);
      setEditingModule(null);
      await invalidateBuilder();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to save module.');
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: deleteModuleRequest,
    onSuccess: async () => {
      message.success('Module deleted successfully.');
      await invalidateBuilder();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to delete module.');
    },
  });

  const lessonMutation = useMutation({
    mutationFn: async ({ lesson, values }: { lesson: LessonWithModule | null; values: LessonFormValues }) => {
      const payload = {
        moduleId: values.moduleId,
        title: values.title.trim(),
        videoUrl: values.videoUrl?.trim() || null,
        orderIndex: values.orderIndex,
      };
      if (lesson) {
        await updateLessonRequest(lesson.id, payload);
      } else {
        await createLessonRequest(values.moduleId, {
          title: payload.title,
          videoUrl: payload.videoUrl ?? undefined,
          orderIndex: payload.orderIndex,
        });
      }
    },
    onSuccess: async (_result, variables) => {
      message.success(variables.lesson ? 'Lesson updated successfully.' : 'Lesson created successfully.');
      setLessonModalOpen(false);
      setEditingLesson(null);
      await invalidateBuilder();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to save lesson.');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: deleteLessonRequest,
    onSuccess: async () => {
      message.success('Lesson deleted successfully.');
      await invalidateBuilder();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to delete lesson.');
    },
  });

  const materialMutation = useMutation({
    mutationFn: async (values: MaterialFormValues) => {
      if (!materialsLesson) throw new Error('Select a lesson before saving materials.');
      if (materialFile) {
        await uploadLessonMaterialRequest(materialsLesson.id, materialFile, {
          title: values.title.trim(),
          type: values.type,
        });
        return;
      }
      if (!values.url?.trim()) {
        throw new Error('Provide a URL when no file is selected.');
      }
      await createLessonMaterialRequest(materialsLesson.id, {
        title: values.title.trim(),
        type: values.type,
        url: values.url.trim(),
      });
    },
    onSuccess: async () => {
      message.success('Material saved successfully.');
      setMaterialFile(null);
      await invalidateBuilder();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to save material.');
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: deleteLessonMaterialRequest,
    onSuccess: async () => {
      message.success('Material deleted successfully.');
      await invalidateBuilder();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to delete material.');
    },
  });

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleModalOpen(true);
  };

  const openCreateLesson = (moduleId?: string) => {
    setEditingLesson(null);
    if (moduleId) setSelectedModuleId(moduleId);
    setLessonModalOpen(true);
  };

  const toLessonWithModule = (lesson: LessonListItem, module: ModuleWithLessons): LessonWithModule => ({
    ...lesson,
    moduleTitle: module.title,
  });

  return (
    <ClientLayout>
      <ClientPageContainer>
        <section className="instructor-lessons-page">
          <div className="instructor-lessons-hero">
            <div>
              <Typography.Text className="instructor-lessons-eyebrow">Course builder</Typography.Text>
              <Typography.Title level={1}>Lessons & Modules</Typography.Title>
              <Typography.Paragraph>
                Organize course modules, build lessons, and attach materials using real course content data.
              </Typography.Paragraph>
            </div>
            <div className="instructor-lessons-hero__actions">
              <Button icon={<ArrowLeft size={16} />}><Link to="/instructor/courses">Manage Courses</Link></Button>
              <Button type="primary" icon={<Plus size={16} />} disabled={!effectiveCourseId} onClick={openCreateModule}>
                Create Module
              </Button>
            </div>
          </div>

          {coursesQuery.isError ? <Alert type="error" showIcon message="Unable to load instructor courses." /> : null}
          {modulesQuery.isError ? <Alert type="warning" showIcon message="Unable to load modules for the selected course." /> : null}

          <Card className="instructor-lessons-course-picker">
            {coursesQuery.isLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : courses.length ? (
              <div className="instructor-lessons-course-picker__inner">
                <div>
                  <Typography.Text className="instructor-lessons-eyebrow">Selected course</Typography.Text>
                  <Typography.Title level={3}>{selectedCourse?.title ?? 'Select a course'}</Typography.Title>
                  {selectedCourse ? (
                    <div className="instructor-lessons-course-picker__meta">
                      <Tag color={getStatusColor(selectedCourse.status)}>{getStatusLabel(selectedCourse.status)}</Tag>
                      <span>{selectedCourse.description || 'No course description yet.'}</span>
                    </div>
                  ) : null}
                </div>
                <Select
                  value={effectiveCourseId}
                  options={courses.map((course) => ({ value: course.id, label: course.title }))}
                  onChange={(value) => {
                    setSelectedCourseId(value);
                    setSelectedModuleId(undefined);
                  }}
                  showSearch
                  optionFilterProp="label"
                  aria-label="Select course"
                />
              </div>
            ) : (
              <Empty description="Create a course first before adding lessons and modules.">
                <Button type="primary"><Link to="/instructor/courses">Create a course</Link></Button>
              </Empty>
            )}
          </Card>

          {effectiveCourseId ? (
            <div className="lesson-builder-summary">
              <Card><span>Modules</span><strong>{modules.length}</strong></Card>
              <Card><span>Lessons</span><strong>{totalLessons}</strong></Card>
              <Card><span>Published lessons</span><strong>{publishedLessons}</strong></Card>
              <Card><span>Loaded materials</span><strong>{loadedMaterialCount}</strong></Card>
            </div>
          ) : null}

          {!effectiveCourseId && !coursesQuery.isLoading ? (
            <Card className="lesson-builder-empty-card">
              <Empty description="Select a course to start building lessons." />
            </Card>
          ) : null}

          {effectiveCourseId ? (
            modulesQuery.isLoading ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : modules.length ? (
              <div className="lesson-builder-layout">
                <Card className="lesson-builder-modules-panel">
                  <div className="lesson-builder-section-header">
                    <div>
                      <Typography.Text className="instructor-lessons-eyebrow">Modules</Typography.Text>
                      <Typography.Title level={3}>Course structure</Typography.Title>
                    </div>
                    <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModule}>Module</Button>
                  </div>
                  <div className="lesson-builder-module-list">
                    {modules.map((module) => (
                      <article
                        className={`lesson-builder-module-card${module.id === effectiveModuleId ? ' lesson-builder-module-card--active' : ''}`}
                        key={module.id}
                      >
                        <button type="button" onClick={() => setSelectedModuleId(module.id)}>
                          <span><Layers3 size={17} /> Module {module.orderIndex}</span>
                          <strong>{module.title}</strong>
                          <small>{module.lessons.length} lessons</small>
                        </button>
                        <div className="lesson-builder-module-card__actions">
                          <Button size="small" icon={<Pencil size={14} />} onClick={() => {
                            setEditingModule(module);
                            setModuleModalOpen(true);
                          }}>
                            Edit
                          </Button>
                          <Button size="small" icon={<Plus size={14} />} onClick={() => openCreateLesson(module.id)}>
                            Add lesson
                          </Button>
                          <Popconfirm
                            title="Delete this module?"
                            description="All lessons in this module will also be removed."
                            okText="Delete"
                            cancelText="Cancel"
                            onConfirm={() => deleteModuleMutation.mutate(module.id)}
                          >
                            <Button danger size="small" icon={<Trash2 size={14} />} loading={deleteModuleMutation.isPending}>
                              Delete
                            </Button>
                          </Popconfirm>
                        </div>
                      </article>
                    ))}
                  </div>
                </Card>

                <Card className="lesson-builder-lessons-panel">
                  <div className="lesson-builder-section-header">
                    <div>
                      <Typography.Text className="instructor-lessons-eyebrow">Selected module</Typography.Text>
                      <Typography.Title level={3}>{selectedModule?.title ?? 'Module lessons'}</Typography.Title>
                    </div>
                    <Button
                      type="primary"
                      icon={<FilePlus2 size={16} />}
                      disabled={!effectiveModuleId}
                      onClick={() => openCreateLesson(effectiveModuleId)}
                    >
                      Add Lesson
                    </Button>
                  </div>

                  {selectedLessons.length ? (
                    <div className="lesson-builder-lesson-list">
                      {selectedLessons.map((lesson) => {
                        const lessonWithModule = selectedModule ? toLessonWithModule(lesson, selectedModule) : null;
                        return (
                          <article className="lesson-builder-lesson-card" key={lesson.id}>
                            <div className="lesson-builder-lesson-card__main">
                              <span><NotebookPen size={17} /> Lesson {lesson.orderIndex}</span>
                              <strong>{lesson.title}</strong>
                              <small>{lesson.videoUrl || 'No video URL'}</small>
                              <div>
                                <Tag color={lesson.isPublished ? 'green' : 'default'}>{lesson.isPublished ? 'Published' : 'Draft'}</Tag>
                                <Tag color="cyan">{lesson.materials?.length ?? 0} loaded materials</Tag>
                              </div>
                            </div>
                            <div className="lesson-builder-lesson-card__actions">
                              <Button size="small" icon={<Pencil size={14} />} disabled={!lessonWithModule} onClick={() => {
                                if (lessonWithModule) {
                                  setEditingLesson(lessonWithModule);
                                  setLessonModalOpen(true);
                                }
                              }}>
                                Edit
                              </Button>
                              <Button size="small" icon={<UploadIcon size={14} />} disabled={!lessonWithModule} onClick={() => {
                                if (lessonWithModule) {
                                  setMaterialsLesson(lessonWithModule);
                                }
                              }}>
                                Materials
                              </Button>
                              <Popconfirm
                                title="Delete this lesson?"
                                description="The lesson will be removed from this module."
                                okText="Delete"
                                cancelText="Cancel"
                                onConfirm={() => deleteLessonMutation.mutate(lesson.id)}
                              >
                                <Button danger size="small" icon={<Trash2 size={14} />} loading={deleteLessonMutation.isPending}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty description="Add a lesson to this module.">
                      <Button type="primary" onClick={() => openCreateLesson(effectiveModuleId)}>Add Lesson</Button>
                    </Empty>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="lesson-builder-empty-card">
                <Empty description="Create your first module to organize this course.">
                  <Button type="primary" onClick={openCreateModule}>Create Module</Button>
                </Empty>
              </Card>
            )
          ) : null}

          <ModuleModal
            open={moduleModalOpen}
            module={editingModule}
            isSubmitting={moduleMutation.isPending}
            onCancel={() => {
              setModuleModalOpen(false);
              setEditingModule(null);
            }}
            onSubmit={async (values) => {
              await moduleMutation.mutateAsync({ module: editingModule, values });
            }}
          />

          <LessonModal
            open={lessonModalOpen}
            lesson={editingLesson}
            selectedModuleId={effectiveModuleId}
            moduleOptions={moduleOptions}
            isSubmitting={lessonMutation.isPending}
            onCancel={() => {
              setLessonModalOpen(false);
              setEditingLesson(null);
            }}
            onSubmit={async (values) => {
              await lessonMutation.mutateAsync({ lesson: editingLesson, values });
            }}
          />

          <MaterialsModal
            lesson={materialsLesson}
            materials={materialsQuery.data ?? []}
            isLoading={materialsQuery.isLoading}
            isSubmitting={materialMutation.isPending}
            materialFile={materialFile}
            onFileChange={setMaterialFile}
            onCancel={() => {
              setMaterialsLesson(null);
              setMaterialFile(null);
            }}
            onSubmit={async (values) => {
              await materialMutation.mutateAsync(values);
            }}
            onDelete={(materialId) => deleteMaterialMutation.mutate(materialId)}
          />
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}
