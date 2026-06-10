import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Navigate } from 'react-router-dom';
import { BookOpenCheck, Link2, Plus, RefreshCw, Trash2, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { canAccess, PERMISSIONS } from '../../../../utils/rbac';
import { listCoursesRequest, type CourseListItem } from '../../../../services/api/courseApi';
import {
  createLessonRequest,
  createLessonMaterialRequest,
  createModuleRequest,
  deleteLessonRequest,
  deleteLessonMaterialRequest,
  deleteModuleRequest,
  listCourseModulesRequest,
  listLessonMaterialsRequest,
  uploadLessonMaterialRequest,
  updateLessonRequest,
  updateModuleRequest,
  type LessonMaterialItem,
  type ModuleWithLessons,
} from '../../../../services/api/lessonApi';
import './index.css';

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
  type: 'pdf' | 'slide' | 'link' | 'reading';
  url?: string;
};

type LessonRow = {
  key: string;
  id: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  orderIndex: number;
  videoUrl?: string | null;
  isPublished: boolean;
  materials: LessonMaterialItem[];
};

function flattenLessons(modules: ModuleWithLessons[]): LessonRow[] {
  return modules
    .flatMap((module) =>
      module.lessons.map((lesson) => ({
        key: lesson.id,
        id: lesson.id,
        moduleId: module.id,
        moduleTitle: module.title,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        videoUrl: lesson.videoUrl,
        isPublished: lesson.isPublished,
        materials: lesson.materials ?? [],
      })),
    )
    .sort((a, b) => {
      if (a.moduleTitle === b.moduleTitle) return a.orderIndex - b.orderIndex;
      return a.moduleTitle.localeCompare(b.moduleTitle);
    });
}

export function LessonManagement() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithLessons | null>(null);
  const [moduleForm] = Form.useForm<ModuleFormValues>();

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null);
  const [lessonForm] = Form.useForm<LessonFormValues>();

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedLessonForMaterials, setSelectedLessonForMaterials] = useState<LessonRow | null>(null);
  const [selectedMaterialFile, setSelectedMaterialFile] = useState<File | null>(null);
  const [lessonMaterials, setLessonMaterials] = useState<LessonMaterialItem[]>([]);
  const [materialForm] = Form.useForm<MaterialFormValues>();

  const canManageLessons = canAccess(user?.role, PERMISSIONS.LESSON_CREATE);

  const courseOptions = useMemo(
    () =>
      courses.map((course) => ({
        value: course.id,
        label: course.title,
      })),
    [courses],
  );
  const selectedCourseExists = selectedCourseId ? courses.some((course) => course.id === selectedCourseId) : false;
  const effectiveSelectedCourseId = selectedCourseExists ? selectedCourseId : courses[0]?.id ?? null;
  const visibleModules = effectiveSelectedCourseId ? modules : [];

  const moduleOptions = useMemo(
    () =>
      visibleModules.map((module) => ({
        value: module.id,
        label: `${module.orderIndex + 1}. ${module.title}`,
      })),
    [visibleModules],
  );

  const lessonRows = useMemo(() => flattenLessons(visibleModules), [visibleModules]);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    setErrorMessage(null);

    try {
      const result = await listCoursesRequest({ includeDeleted: false });
      const manageableCourses = result.data.filter((course) => user?.role === 'ADMIN' || course.instructorId === user?.id);
      setCourses(manageableCourses);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load courses.');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadModules = async (courseId: string) => {
    setIsLoadingModules(true);
    setErrorMessage(null);

    try {
      const result = await listCourseModulesRequest(courseId);
      setModules(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load modules.');
    } finally {
      setIsLoadingModules(false);
    }
  };

  useEffect(() => {
    if (canManageLessons) {
      void loadCourses();
    }
  }, [canManageLessons]);

  useEffect(() => {
    if (effectiveSelectedCourseId && canManageLessons) {
      void loadModules(effectiveSelectedCourseId);
    }
  }, [effectiveSelectedCourseId, canManageLessons]);

  const openCreateModuleModal = () => {
    setEditingModule(null);
    moduleForm.resetFields();
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (module: ModuleWithLessons) => {
    setEditingModule(module);
    moduleForm.setFieldsValue({
      title: module.title,
      orderIndex: module.orderIndex,
    });
    setIsModuleModalOpen(true);
  };

  const closeModuleModal = () => {
    setIsModuleModalOpen(false);
    setEditingModule(null);
    moduleForm.resetFields();
  };

  const submitModule = async () => {
    if (!effectiveSelectedCourseId) return;

    const values = await moduleForm.validateFields();
    const payload = {
      title: values.title.trim(),
      orderIndex: values.orderIndex,
    };

    setIsMutating(editingModule?.id ?? 'module-new');
    setErrorMessage(null);

    try {
      if (editingModule) {
        await updateModuleRequest(editingModule.id, payload);
      } else {
        await createModuleRequest(effectiveSelectedCourseId, payload);
      }

      closeModuleModal();
      await loadModules(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save module.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!effectiveSelectedCourseId) return;

    setIsMutating(moduleId);
    setErrorMessage(null);

    try {
      await deleteModuleRequest(moduleId);
      await loadModules(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete module.');
    } finally {
      setIsMutating(null);
    }
  };

  const openCreateLessonModal = () => {
    setEditingLesson(null);
    lessonForm.setFieldsValue({
      moduleId: visibleModules[0]?.id,
    });
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = (lesson: LessonRow) => {
    setEditingLesson(lesson);
    lessonForm.setFieldsValue({
      moduleId: lesson.moduleId,
      title: lesson.title,
      videoUrl: lesson.videoUrl ?? undefined,
      orderIndex: lesson.orderIndex,
    });
    setIsLessonModalOpen(true);
  };

  const closeLessonModal = () => {
    setIsLessonModalOpen(false);
    setEditingLesson(null);
    lessonForm.resetFields();
  };

  const submitLesson = async () => {
    if (!effectiveSelectedCourseId) return;

    const values = await lessonForm.validateFields();

    setIsMutating(editingLesson?.id ?? 'lesson-new');
    setErrorMessage(null);

    try {
      if (editingLesson) {
        await updateLessonRequest(editingLesson.id, {
          moduleId: values.moduleId,
          title: values.title.trim(),
          videoUrl: values.videoUrl?.trim() || null,
          orderIndex: values.orderIndex,
        });
      } else {
        await createLessonRequest(values.moduleId, {
          title: values.title.trim(),
          videoUrl: values.videoUrl?.trim() || undefined,
          orderIndex: values.orderIndex,
        });
      }

      closeLessonModal();
      await loadModules(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save lesson.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!effectiveSelectedCourseId) return;

    setIsMutating(lessonId);
    setErrorMessage(null);

    try {
      await deleteLessonRequest(lessonId);
      await loadModules(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete lesson.');
    } finally {
      setIsMutating(null);
    }
  };

  const openMaterialModal = async (lesson: LessonRow) => {
    setSelectedLessonForMaterials(lesson);
    setLessonMaterials(lesson.materials);
    setSelectedMaterialFile(null);
    materialForm.setFieldsValue({
      title: '',
      type: 'pdf',
      url: undefined,
    });
    setIsMaterialModalOpen(true);

    try {
      const latestMaterials = await listLessonMaterialsRequest(lesson.id);
      setLessonMaterials(latestMaterials);
    } catch {
      // Fallback to module payload data if dedicated material fetch fails.
    }
  };

  const closeMaterialModal = () => {
    setIsMaterialModalOpen(false);
    setSelectedLessonForMaterials(null);
    setSelectedMaterialFile(null);
    setLessonMaterials([]);
    materialForm.resetFields();
  };

  const submitMaterial = async () => {
    if (!selectedLessonForMaterials || !effectiveSelectedCourseId) return;

    const values = await materialForm.validateFields();
    setIsMutating(`material-${selectedLessonForMaterials.id}`);
    setErrorMessage(null);

    try {
      if (selectedMaterialFile) {
        await uploadLessonMaterialRequest(selectedLessonForMaterials.id, selectedMaterialFile, {
          title: values.title.trim(),
          type: values.type,
        });
      } else {
        if (!values.url?.trim()) {
          throw new Error('Provide a URL when no file is selected.');
        }

        await createLessonMaterialRequest(selectedLessonForMaterials.id, {
          title: values.title.trim(),
          type: values.type,
          url: values.url.trim(),
        });
      }

      const latestMaterials = await listLessonMaterialsRequest(selectedLessonForMaterials.id);
      setLessonMaterials(latestMaterials);
      await loadModules(effectiveSelectedCourseId);
      materialForm.setFieldsValue({ title: '', type: values.type, url: undefined });
      setSelectedMaterialFile(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save material.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!selectedLessonForMaterials || !effectiveSelectedCourseId) return;

    setIsMutating(materialId);
    setErrorMessage(null);

    try {
      await deleteLessonMaterialRequest(materialId);
      const latestMaterials = await listLessonMaterialsRequest(selectedLessonForMaterials.id);
      setLessonMaterials(latestMaterials);
      await loadModules(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete material.');
    } finally {
      setIsMutating(null);
    }
  };

  const moduleColumns: ColumnsType<ModuleWithLessons> = [
    {
      title: 'Module',
      key: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">Order #{record.orderIndex}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Lessons',
      key: 'lessons',
      render: (_, record) => <Tag color="blue">{record.lessons.length}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditModuleModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this module?"
            description="All lessons in this module will also be removed."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void handleDeleteModule(record.id)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} loading={isMutating === record.id}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lessonColumns: ColumnsType<LessonRow> = [
    {
      title: 'Lesson',
      key: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">{record.videoUrl || 'No video URL'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'moduleTitle',
      key: 'moduleTitle',
    },
    {
      title: 'Order',
      dataIndex: 'orderIndex',
      key: 'orderIndex',
      render: (value) => <Tag color="geekblue">{value}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isPublished',
      key: 'isPublished',
      render: (value) => (value ? <Tag color="green">Published</Tag> : <Tag color="default">Draft</Tag>),
    },
    {
      title: 'Materials',
      key: 'materials',
      render: (_, record) => <Tag color="cyan">{record.materials.length}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditLessonModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this lesson?"
            description="The lesson will be soft deleted and hidden from lists."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void handleDeleteLesson(record.id)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} loading={isMutating === record.id}>
              Delete
            </Button>
          </Popconfirm>
          <Button size="small" icon={<UploadIcon size={14} />} onClick={() => void openMaterialModal(record)}>
            Materials
          </Button>
        </Space>
      ),
    },
  ];

  const materialColumns: ColumnsType<LessonMaterialItem> = [
    {
      title: 'Material',
      key: 'material',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Link href={record.url} target="_blank" rel="noreferrer">
            <Space size={4}>
              <Link2 size={14} />
              Open file
            </Space>
          </Typography.Link>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (value) => <Tag color="purple">{String(value).toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete this material?"
          description="This removes the material from the lesson."
          okText="Delete"
          cancelText="Cancel"
          onConfirm={() => void handleDeleteMaterial(record.id)}
        >
          <Button danger size="small" icon={<Trash2 size={14} />} loading={isMutating === record.id}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (!canManageLessons) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Card className="lesson-management-card" bordered={false}>
        <Space direction="vertical" size={16} className="lesson-management-card__content">
          <div className="lesson-management-toolbar">
            <Space wrap>
              <Select
                className="lesson-management-toolbar__course-select"
                placeholder="Select a course"
                value={effectiveSelectedCourseId ?? undefined}
                onChange={(value) => setSelectedCourseId(value)}
                options={courseOptions}
                loading={isLoadingCourses}
                showSearch
                optionFilterProp="label"
              />
              <Button icon={<RefreshCw size={16} />} onClick={() => void loadCourses()} loading={isLoadingCourses}>
                Refresh courses
              </Button>
            </Space>
            <Space>
              <Button type="default" icon={<BookOpenCheck size={16} />} onClick={openCreateModuleModal} disabled={!effectiveSelectedCourseId}>
                New module
              </Button>
              <Button type="primary" icon={<Plus size={16} />} onClick={openCreateLessonModal} disabled={!effectiveSelectedCourseId || visibleModules.length === 0}>
                New lesson
              </Button>
            </Space>
          </div>

          {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

          <div className="lesson-management-grid">
            <Card title="Modules" bordered={false} className="lesson-management-grid__card">
              <Table<ModuleWithLessons>
                rowKey="id"
                columns={moduleColumns}
                dataSource={visibleModules}
                loading={isLoadingModules}
                pagination={false}
                locale={{ emptyText: effectiveSelectedCourseId ? 'No modules yet.' : 'Select a course to view modules.' }}
              />
            </Card>

            <Card title="Lessons" bordered={false} className="lesson-management-grid__card">
              <Table<LessonRow>
                rowKey="id"
                columns={lessonColumns}
                dataSource={lessonRows}
                loading={isLoadingModules}
                pagination={false}
                locale={{ emptyText: effectiveSelectedCourseId ? 'No lessons yet.' : 'Select a course to view lessons.' }}
              />
            </Card>
          </div>
        </Space>
      </Card>

      <Modal
        title={editingModule ? 'Edit module' : 'Create module'}
        open={isModuleModalOpen}
        onCancel={closeModuleModal}
        onOk={() => void submitModule()}
        confirmLoading={isMutating === (editingModule?.id ?? 'module-new')}
        okText={editingModule ? 'Save module' : 'Create module'}
      >
        <Form form={moduleForm} layout="vertical" initialValues={{ title: '' }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Enter a module title.' },
              { min: 2, message: 'Title must be at least 2 characters.' },
            ]}
          >
            <Input placeholder="Module 1: Getting Started" />
          </Form.Item>
          <Form.Item label="Order index" name="orderIndex">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingLesson ? 'Edit lesson' : 'Create lesson'}
        open={isLessonModalOpen}
        onCancel={closeLessonModal}
        onOk={() => void submitLesson()}
        confirmLoading={isMutating === (editingLesson?.id ?? 'lesson-new')}
        okText={editingLesson ? 'Save lesson' : 'Create lesson'}
      >
        <Form form={lessonForm} layout="vertical">
          <Form.Item label="Module" name="moduleId" rules={[{ required: true, message: 'Select a module.' }]}>
            <Select options={moduleOptions} placeholder="Select module" />
          </Form.Item>
          <Form.Item
            label="Title"
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
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedLessonForMaterials ? `Materials: ${selectedLessonForMaterials.title}` : 'Lesson materials'}
        open={isMaterialModalOpen}
        onCancel={closeMaterialModal}
        onOk={() => void submitMaterial()}
        confirmLoading={isMutating === `material-${selectedLessonForMaterials?.id ?? 'new'}`}
        okText="Save material"
        width={860}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Form
            form={materialForm}
            layout="vertical"
            initialValues={{
              title: '',
              type: 'pdf',
            }}
          >
            <Form.Item
              label="Title"
              name="title"
              rules={[
                { required: true, message: 'Enter material title.' },
                { min: 2, message: 'Title must be at least 2 characters.' },
              ]}
            >
              <Input placeholder="Lesson handout" />
            </Form.Item>

            <Form.Item label="Type" name="type" rules={[{ required: true, message: 'Select a type.' }]}>
              <Select
                options={[
                  { value: 'pdf', label: 'PDF' },
                  { value: 'slide', label: 'Slide deck' },
                  { value: 'reading', label: 'Reading' },
                  { value: 'link', label: 'Link' },
                ]}
              />
            </Form.Item>

            <Form.Item label="Upload file" extra="If no file is selected, URL will be used instead.">
              <Upload
                maxCount={1}
                beforeUpload={(file) => {
                  setSelectedMaterialFile(file);
                  return false;
                }}
                onRemove={() => {
                  setSelectedMaterialFile(null);
                  return true;
                }}
                fileList={selectedMaterialFile ? [{ uid: 'material-file', name: selectedMaterialFile.name, status: 'done' }] : []}
              >
                <Button icon={<UploadIcon size={16} />}>Choose file</Button>
              </Upload>
            </Form.Item>

            <Form.Item label="Or material URL" name="url" rules={[{ type: 'url', message: 'Enter a valid URL.' }]}>
              <Input placeholder="https://example.com/lesson-material" />
            </Form.Item>
          </Form>

          <Table<LessonMaterialItem>
            rowKey="id"
            columns={materialColumns}
            dataSource={lessonMaterials}
            pagination={false}
            locale={{ emptyText: 'No materials yet.' }}
            scroll={{ x: 640 }}
          />
        </Space>
      </Modal>
    </>
  );
}

