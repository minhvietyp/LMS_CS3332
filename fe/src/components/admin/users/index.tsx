import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popover,
  Segmented,
  Select,
  Skeleton,
  Space,
  Spin,
  Switch,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeft,
  Eye,
  Filter,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createUserRequest,
  getUserByIdRequest,
  getRoleAccessMatrixRequest,
  listUsersRequest,
  restoreUserRequest,
  softDeleteUserRequest,
  updateUserRequest,
  type CreateUserRequest,
  type RoleAccessSummary,
  type UpdateUserRequest,
  type UserListItem,
} from '../../../services/authApi';
import { ACCESS_CONTROL_PERMISSION_LABELS, PERMISSIONS } from '../../../utils/rbac';
import { useAuth } from '../../context/AuthContext';
import './index.css';

type UserRoleOption = UserListItem['role'];
type UserStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED';
type UserColumnKey = 'role' | 'status' | 'updated';
type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  role: UserRoleOption;
  avatarUrl?: string;
  isActive: boolean;
};

const roleOptions: Array<{ value: UserRoleOption; label: UserRoleOption }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'INSTRUCTOR', label: 'Instructor' },
  { value: 'STUDENT', label: 'Student' },
];

const statusSegmentOptions = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DELETED', label: 'Deleted' },
] satisfies Array<{ value: UserStatusFilter; label: string }>;

const columnOptions: Array<{ label: string; value: UserColumnKey }> = [
  { label: 'Role', value: 'role' },
  { label: 'Status', value: 'status' },
  { label: 'Updated', value: 'updated' },
];

const permissionGroups = [
  {
    title: 'Users',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_RESTORE,
    ],
  },
  {
    title: 'Courses',
    permissions: [
      PERMISSIONS.COURSE_READ,
      PERMISSIONS.COURSE_CREATE,
      PERMISSIONS.COURSE_UPDATE,
      PERMISSIONS.COURSE_DELETE,
    ],
  },
  {
    title: 'Lessons',
    permissions: [PERMISSIONS.LESSON_CREATE],
  },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function buildInitials(name: string) {
  const segments = name.trim().split(/\s+/).filter(Boolean);
  return segments.slice(0, 2).map((segment) => segment[0]?.toUpperCase() ?? '').join('');
}

function getRoleLabel(role: UserRoleOption) {
  return role === 'ADMIN' ? 'Admin' : role === 'INSTRUCTOR' ? 'Instructor' : 'Student';
}

function getUserStatusMeta(user: Pick<UserListItem, 'deletedAt' | 'isActive'>) {
  if (user.deletedAt) {
    return {
      label: 'Deleted',
      tone: 'danger' as const,
      color: '#ef4444',
      background: '#fee2e2',
    };
  }

  if (user.isActive) {
    return {
      label: 'Active',
      tone: 'success' as const,
      color: '#15803d',
      background: '#dcfce7',
    };
  }

  return {
    label: 'Inactive',
    tone: 'muted' as const,
    color: '#475569',
    background: '#e2e8f0',
  };
}

function UserStatusPill({ user }: { user: Pick<UserListItem, 'deletedAt' | 'isActive'> }) {
  const status = getUserStatusMeta(user);
  return (
    <span
      className={`admin-user-pill admin-user-pill--${status.tone}`}
      style={{ backgroundColor: status.background, color: status.color }}
    >
      {status.label}
    </span>
  );
}

function UserRolePill({ role }: { role: UserRoleOption }) {
  const tone = role === 'ADMIN' ? 'admin' : role === 'INSTRUCTOR' ? 'instructor' : 'student';
  const label = getRoleLabel(role);

  return <span className={`admin-user-pill admin-user-pill--role admin-user-pill--${tone}`}>{label}</span>;
}

function getPermissionLabel(permission: string) {
  if (permission === PERMISSIONS.USER_READ) {
    return 'View user information';
  }

  return ACCESS_CONTROL_PERMISSION_LABELS[
    permission as keyof typeof ACCESS_CONTROL_PERMISSION_LABELS
  ] ?? permission;
}

function UserPermissionSection({
  roleSummary,
  editable = false,
}: {
  roleSummary?: RoleAccessSummary;
  editable?: boolean;
}) {
  if (!roleSummary) {
    return (
      <div className="admin-user-permissions__empty">
        <Typography.Text type="secondary">No role access data available.</Typography.Text>
      </div>
    );
  }

  return (
    <div className="admin-user-permissions">
      <div className="admin-user-permissions__summary">
        <div>
          <Typography.Text strong>{roleSummary.label}</Typography.Text>
          <Typography.Paragraph className="admin-user-permissions__description">
            {roleSummary.description}
          </Typography.Paragraph>
        </div>
        <UserRolePill role={roleSummary.role} />
      </div>

      {editable ? (
        <Alert
          type="info"
          showIcon
          className="admin-user-permissions__alert"
          message="Permissions are assigned by role in this LMS. Change the role above to review the access this account will receive."
        />
      ) : null}

      <div className="admin-user-permissions__groups">
        {permissionGroups.map((group) => (
          <div key={group.title} className="admin-user-permissions__group">
            <Typography.Text strong className="admin-user-permissions__group-title">
              {group.title}
            </Typography.Text>
            <div className="admin-user-permissions__grid">
              {group.permissions.map((permission) => (
                <div key={permission} className="admin-user-permissions__item">
                  <Checkbox checked={roleSummary.permissions.includes(permission)} disabled>
                    {getPermissionLabel(permission)}
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserDeleteModal({
  open,
  user,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  user: UserListItem | null;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true, loading }}
      title="Delete User"
      centered
      destroyOnHidden
    >
      <Typography.Paragraph className="admin-user-delete__copy">
        {user
          ? `Are you sure you want to delete ${user.name}? This will soft delete the account and remove it from active user lists.`
          : 'Are you sure you want to delete this user?'}
      </Typography.Paragraph>
    </Modal>
  );
}

function UserColumnsPopover({
  selectedColumns,
  onChange,
}: {
  selectedColumns: UserColumnKey[];
  onChange: (values: UserColumnKey[]) => void;
}) {
  return (
    <div className="admin-user-columns">
      <Typography.Text strong>Toggle columns</Typography.Text>
      <Checkbox.Group
        className="admin-user-columns__group"
        options={columnOptions}
        value={selectedColumns}
        onChange={(values) => onChange(values as UserColumnKey[])}
      />
    </div>
  );
}

function UserCardHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="admin-user-card__header">
      <div className="admin-user-card__icon">{icon}</div>
      <div>
        <Typography.Title level={4} className="admin-user-card__title">
          {title}
        </Typography.Title>
        <Typography.Paragraph className="admin-user-card__subtitle">{subtitle}</Typography.Paragraph>
      </div>
    </div>
  );
}

export function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<UserColumnKey[]>(['role', 'status', 'updated']);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? '10'));
  const role = (searchParams.get('role') as UserRoleOption | null) ?? undefined;
  const status = (searchParams.get('status') as UserStatusFilter | null) ?? 'ALL';
  const search = searchParams.get('search') ?? '';

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      if (nextSearch) {
        nextParams.set('search', nextSearch);
      } else {
        nextParams.delete('search');
      }
      nextParams.set('page', '1');
      setSearchParams(nextParams, { replace: true });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search, searchInput, searchParams, setSearchParams]);

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await listUsersRequest({
        page,
        limit,
        search: search || undefined,
        role,
        isActive: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
        includeDeleted: status === 'ALL' || status === 'DELETED',
        deleted: status === 'DELETED' ? true : undefined,
      });
      setUsers(result.data);
      setMeta(result.meta ?? { page, limit, total: result.data.length, totalPages: 1 });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    void loadUsers();
  }, [isAdmin, limit, page, refreshKey, role, search, status]);

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

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsMutating(deleteTarget.id);
    setErrorMessage(null);

    try {
      await softDeleteUserRequest(deleteTarget.id);
      message.success('User deleted successfully.');
      setDeleteTarget(null);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete user.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleRestore = async (record: UserListItem) => {
    setIsMutating(record.id);
    setErrorMessage(null);

    try {
      await restoreUserRequest(record.id);
      message.success('User restored successfully.');
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to restore user.');
    } finally {
      setIsMutating(null);
    }
  };

  const columns = useMemo<ColumnsType<UserListItem>>(() => {
    const result: ColumnsType<UserListItem> = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (_, record) => (
          <button
            type="button"
            className="admin-user-row"
            onClick={() => navigate(`/admin/users/${record.id}`)}
          >
            <Avatar
              size={46}
              src={record.avatarUrl ?? undefined}
              className="admin-user-row__avatar"
              icon={!record.avatarUrl ? <UserRound size={18} /> : undefined}
            >
              {!record.avatarUrl ? buildInitials(record.name) : null}
            </Avatar>
            <span className="admin-user-row__copy">
              <span className="admin-user-row__name">{record.name}</span>
              <span className="admin-user-row__email">{record.email}</span>
            </span>
          </button>
        ),
      },
    ];

    if (visibleColumns.includes('role')) {
      result.push({
        title: 'Role',
        dataIndex: 'role',
        key: 'role',
        render: (value: UserRoleOption) => <UserRolePill role={value} />,
      });
    }

    if (visibleColumns.includes('status')) {
      result.push({
        title: 'Status',
        key: 'status',
        render: (_, record) => <UserStatusPill user={record} />,
      });
    }

    if (visibleColumns.includes('updated')) {
      result.push({
        title: 'Updated',
        key: 'updatedAt',
        render: (_, record) => (
          <span className="admin-user-table__date">{formatDateTime(record.updatedAt)}</span>
        ),
      });
    }

    result.push({
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size={4} className="admin-user-actions">
          <Tooltip title="View user">
            <Button
              type="text"
              icon={<Eye size={16} />}
              className="admin-user-actions__button"
              onClick={() => navigate(`/admin/users/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit user">
            <Button
              type="text"
              icon={<Pencil size={16} />}
              className="admin-user-actions__button"
              onClick={() => navigate(`/admin/users/${record.id}/edit`)}
              disabled={Boolean(record.deletedAt)}
            />
          </Tooltip>
          {record.deletedAt ? (
            <Tooltip title="Restore user">
              <Button
                type="text"
                icon={<RotateCcw size={16} />}
                className="admin-user-actions__button"
                loading={isMutating === record.id}
                onClick={() => void handleRestore(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Delete user">
              <Button
                type="text"
                danger
                icon={<Trash2 size={16} />}
                className="admin-user-actions__button admin-user-actions__button--danger"
                loading={isMutating === record.id}
                onClick={() => setDeleteTarget(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    });

    return result;
  }, [isMutating, navigate, visibleColumns]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <section className="admin-users-panel">
        <div className="admin-users-panel__toolbar">
          <div className="admin-users-panel__filters">
            <Segmented
              options={statusSegmentOptions}
              value={status}
              onChange={(value) => updateQuery({ status: value === 'ALL' ? undefined : String(value), page: '1' })}
            />
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search users..."
              prefix={<Filter size={16} />}
              className="admin-users-panel__search"
            />
            <Select
              allowClear
              value={role}
              onChange={(value) => updateQuery({ role: value, page: '1' })}
              options={roleOptions}
              placeholder="Role"
              className="admin-users-panel__role"
            />
          </div>

          <div className="admin-users-panel__actions">
            <Popover
              trigger="click"
              placement="bottomRight"
              content={<UserColumnsPopover selectedColumns={visibleColumns} onChange={setVisibleColumns} />}
            >
              <Button icon={<Settings2 size={16} />}>Columns</Button>
            </Popover>
            <Button icon={<RefreshCw size={16} />} onClick={() => setRefreshKey((current) => current + 1)} loading={isLoading}>
              Refresh
            </Button>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/admin/users/create')}>
              Add User
            </Button>
          </div>
        </div>

        {errorMessage ? <Alert type="error" showIcon message={errorMessage} className="admin-users-panel__alert" /> : null}

        <Card className="admin-users-card" variant="borderless">
          <Table<UserListItem>
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={isLoading}
            pagination={false}
            locale={{
              emptyText: isLoading ? (
                <Spin size="small" />
              ) : (
                <Empty description="No users found. Try adjusting your search or filters." />
              ),
            }}
            className="admin-users-table"
            scroll={{ x: 940 }}
          />

          <div className="admin-users-panel__footer">
            <Typography.Text className="admin-users-panel__meta">
              Showing {users.length} of {meta.total} users
            </Typography.Text>
            <Pagination
              current={meta.page}
              pageSize={meta.limit}
              total={meta.total}
              showSizeChanger
              pageSizeOptions={['10', '20', '50']}
              onChange={(nextPage, nextPageSize) => {
                updateQuery({
                  page: String(nextPage),
                  limit: String(nextPageSize),
                });
              }}
            />
          </div>
        </Card>
      </section>

      <UserDeleteModal
        open={Boolean(deleteTarget)}
        user={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        loading={Boolean(deleteTarget && isMutating === deleteTarget.id)}
      />
    </>
  );
}

export function UserManagementForm({
  mode,
  userId,
}: {
  mode: 'create' | 'edit';
  userId?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<UserFormValues>();
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleMatrix, setRoleMatrix] = useState<RoleAccessSummary[]>([]);
  const [roleMatrixError, setRoleMatrixError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const selectedRole = Form.useWatch('role', form) ?? 'STUDENT';

  useEffect(() => {
    let active = true;

    if (!isAdmin || mode !== 'edit') {
      return () => {
        active = false;
      };
    }

    void getRoleAccessMatrixRequest()
      .then((matrix) => {
        if (active) {
          setRoleMatrix(matrix);
        }
      })
      .catch((error) => {
        if (active) {
          setRoleMatrixError(error instanceof Error ? error.message : 'Failed to load role permissions.');
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || mode !== 'edit' || !userId) {
      return;
    }

    const loadUser = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const detail = await getUserByIdRequest(userId);
        form.setFieldsValue({
          name: detail.name,
          email: detail.email,
          role: detail.role,
          avatarUrl: detail.avatarUrl ?? undefined,
          isActive: detail.isActive,
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load user.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [form, isAdmin, mode, userId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === 'create') {
        const payload: CreateUserRequest = {
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password!.trim(),
          role: values.role,
          avatarUrl: values.avatarUrl?.trim() || undefined,
          isActive: values.isActive,
        };
        const createdUser = await createUserRequest(payload);
        message.success('User created successfully.');
        navigate(`/admin/users/${createdUser.id}`);
      } else if (userId) {
        const payload: UpdateUserRequest = {
          name: values.name.trim(),
          email: values.email.trim(),
          role: values.role,
          avatarUrl: values.avatarUrl?.trim() || undefined,
          isActive: values.isActive,
        };
        await updateUserRequest(userId, payload);
        message.success('User updated successfully.');
        navigate(`/admin/users/${userId}`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoleSummary = roleMatrix.find((item) => item.role === selectedRole);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="admin-user-form-layout">
      <Card className="admin-users-card admin-user-form-card" variant="borderless">
        {isLoading ? (
          <div className="admin-users-state">
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" size={20} className="admin-users-card__content">
            <UserCardHeader
              title={mode === 'create' ? 'User Details' : 'Edit User'}
              subtitle={
                mode === 'create'
                  ? 'Provide the required account fields below to create a new LMS user.'
                  : 'Modify the fields below and save to update this user.'
              }
              icon={<Pencil size={18} />}
            />

            {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

            <Form
              layout="vertical"
              form={form}
              initialValues={{
                name: '',
                email: '',
                password: '',
                role: 'STUDENT',
                avatarUrl: '',
                isActive: true,
              }}
              className="admin-user-form"
            >
                <Form.Item
                  label="Name"
                  name="name"
                  rules={[
                    { required: true, message: 'Enter the user name.' },
                    { min: 2, message: 'Name must be at least 2 characters.' },
                  ]}
                >
                  <Input placeholder="Aigars Silkans" />
                </Form.Item>

                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Enter the user email.' },
                    { type: 'email', message: 'Enter a valid email address.' },
                  ]}
                >
                  <Input placeholder="aigars@company.com" />
                </Form.Item>

                {mode === 'create' ? (
                  <Form.Item
                    label="Temporary Password"
                    name="password"
                    rules={[
                      { required: true, message: 'Enter a password.' },
                      { min: 6, message: 'Password must be at least 6 characters.' },
                    ]}
                  >
                    <Input.Password placeholder="Create a temporary password" />
                  </Form.Item>
                ) : null}

                <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Choose a role.' }]}>
                  <Select options={roleOptions} />
                </Form.Item>

                <div className="admin-user-form__role-hint">
                  <Button
                    type={selectedRole === 'ADMIN' ? 'primary' : 'default'}
                    onClick={() => form.setFieldValue('role', 'ADMIN')}
                  >
                    Admin access
                  </Button>
                  <Button
                    type={selectedRole === 'INSTRUCTOR' ? 'primary' : 'default'}
                    onClick={() => form.setFieldValue('role', 'INSTRUCTOR')}
                  >
                    Instructor access
                  </Button>
                  <Button
                    type={selectedRole === 'STUDENT' ? 'primary' : 'default'}
                    onClick={() => form.setFieldValue('role', 'STUDENT')}
                  >
                    Student access
                  </Button>
                </div>

                <Form.Item
                  label="Avatar URL"
                  name="avatarUrl"
                  rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid URL or leave it blank.' }]}
                >
                  <Input placeholder="https://cdn.example.com/avatar.png" />
                </Form.Item>

                <Form.Item label="Status" className="admin-user-form__switch">
                  <Form.Item name="isActive" valuePropName="checked" noStyle>
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                  </Form.Item>
                </Form.Item>

                {mode === 'edit' ? (
                  <Card className="admin-user-form__permissions-card" variant="borderless">
                    <UserCardHeader
                      title="Permissions"
                      subtitle="Review the permissions this account inherits from its selected role."
                      icon={<ShieldCheck size={18} />}
                    />
                    {roleMatrixError ? <Alert type="warning" showIcon message={roleMatrixError} /> : null}
                    <UserPermissionSection roleSummary={selectedRoleSummary} editable />
                  </Card>
                ) : null}

                <Space className="admin-user-form__actions">
                  <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(userId ? `/admin/users/${userId}` : '/admin/users')}>
                    Cancel
                  </Button>
                  <Button type="primary" onClick={() => void handleSubmit()} loading={isSubmitting}>
                    {mode === 'create' ? 'Create User' : 'Save Changes'}
                  </Button>
                </Space>
            </Form>
          </Space>
        )}
      </Card>
    </div>
  );
}

export function UserManagementDetail({ userId }: { userId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userDetail, setUserDetail] = useState<UserListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleMatrix, setRoleMatrix] = useState<RoleAccessSummary[]>([]);

  const isAdmin = user?.role === 'ADMIN';

  const loadUser = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const detail = await getUserByIdRequest(userId);
      setUserDetail(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load user.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    void loadUser();
  }, [isAdmin, userId]);

  useEffect(() => {
    let active = true;

    if (!isAdmin) {
      return () => {
        active = false;
      };
    }

    void getRoleAccessMatrixRequest()
      .then((matrix) => {
        if (active) {
          setRoleMatrix(matrix);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleDelete = async () => {
    setIsMutating(true);
    setErrorMessage(null);

    try {
      await softDeleteUserRequest(userId);
      await loadUser();
      setShowDeleteModal(false);
      message.success('User deleted successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete user.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRestore = async () => {
    setIsMutating(true);
    setErrorMessage(null);

    try {
      await restoreUserRequest(userId);
      await loadUser();
      message.success('User restored successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to restore user.');
    } finally {
      setIsMutating(false);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      {isLoading ? (
        <Card className="admin-users-card" variant="borderless">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} />
      ) : userDetail ? (
        <div className="admin-user-detail">
          <div className="admin-user-detail__hero">
            <div className="admin-user-detail__identity">
              <Typography.Title level={2} className="admin-user-detail__name">
                {userDetail.name}
              </Typography.Title>
              <Typography.Paragraph className="admin-user-detail__email">
                {userDetail.email}
              </Typography.Paragraph>
              <Space wrap className="admin-user-detail__chips">
                <UserRolePill role={userDetail.role} />
                <UserStatusPill user={userDetail} />
              </Space>
            </div>

            <Space wrap>
              <Button icon={<Pencil size={16} />} onClick={() => navigate(`/admin/users/${userDetail.id}/edit`)}>
                Edit
              </Button>
              {userDetail.deletedAt ? (
                <Button icon={<RotateCcw size={16} />} loading={isMutating} onClick={() => void handleRestore()}>
                  Restore
                </Button>
              ) : (
                <Button danger icon={<Trash2 size={16} />} onClick={() => setShowDeleteModal(true)}>
                  Delete
                </Button>
              )}
            </Space>
          </div>

          <div className="admin-user-detail__grid">
            <Card className="admin-users-card admin-user-detail-card" variant="borderless">
              <UserCardHeader
                title="Profile"
                subtitle="User profile information"
                icon={<UserRound size={18} />}
              />
              <div className="admin-user-profile">
                <Avatar size={68} className="admin-user-profile__avatar" src={userDetail.avatarUrl ?? undefined}>
                  {!userDetail.avatarUrl ? buildInitials(userDetail.name) : null}
                </Avatar>
                <div className="admin-user-profile__copy">
                  <Typography.Text strong className="admin-user-profile__name">
                    {userDetail.name}
                  </Typography.Text>
                  <Typography.Text className="admin-user-profile__mail">{userDetail.email}</Typography.Text>
                </div>
              </div>
              <div className="admin-user-kv admin-user-kv--compact">
                <div className="admin-user-kv__row">
                  <span>Role</span>
                  <strong>{getRoleLabel(userDetail.role)}</strong>
                </div>
                <div className="admin-user-kv__row">
                  <span>Avatar URL</span>
                  <strong className="admin-user-kv__truncate">{userDetail.avatarUrl || 'Not available'}</strong>
                </div>
              </div>
            </Card>

            <Card className="admin-users-card admin-user-detail-card" variant="borderless">
              <UserCardHeader
                title="Account Details"
                subtitle="Account status and audit metadata"
                icon={<Mail size={18} />}
              />
              <div className="admin-user-kv">
                <div className="admin-user-kv__row">
                  <span>Status</span>
                  <UserStatusPill user={userDetail} />
                </div>
                <div className="admin-user-kv__row">
                  <span>Created</span>
                  <strong>{formatDateTime(userDetail.createdAt)}</strong>
                </div>
                <div className="admin-user-kv__row">
                  <span>Updated</span>
                  <strong>{formatDateTime(userDetail.updatedAt)}</strong>
                </div>
                {userDetail.deletedAt ? (
                  <>
                    <div className="admin-user-kv__row">
                      <span>Deleted</span>
                      <strong>{formatDateTime(userDetail.deletedAt)}</strong>
                    </div>
                    <div className="admin-user-kv__row">
                      <span>Deleted By</span>
                      <strong>{userDetail.deletedBy || 'Not available'}</strong>
                    </div>
                  </>
                ) : null}
              </div>
            </Card>

            <Card className="admin-users-card admin-user-detail-card" variant="borderless">
              <UserCardHeader
                title="Permissions"
                subtitle="Granted access and capabilities for this role"
                icon={<ShieldCheck size={18} />}
              />
              <UserPermissionSection roleSummary={roleMatrix.find((item) => item.role === userDetail.role)} />
            </Card>
          </div>
        </div>
      ) : (
        <Empty description="User not found." />
      )}

      <UserDeleteModal
        open={showDeleteModal}
        user={userDetail}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => void handleDelete()}
        loading={isMutating}
      />
    </>
  );
}
