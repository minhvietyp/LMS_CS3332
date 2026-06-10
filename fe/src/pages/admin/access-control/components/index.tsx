import { useEffect, useState } from 'react';
import { Alert, Card, Space, Spin, Tag, Typography } from 'antd';
import { Navigate } from 'react-router-dom';
import { getRoleAccessMatrixRequest, type RoleAccessSummary } from '../../../../services/api/authApi';
import { ACCESS_CONTROL_PERMISSION_LABELS } from '../../../../utils/rbac';
import { useAuth } from '../../../../context/useAuth';
import './index.css';

export function AccessControl() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleAccessSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    let active = true;

    const loadMatrix = async () => {
      try {
        const matrix = await getRoleAccessMatrixRequest();
        if (active) {
          setRoles(matrix);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load access control data.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (isAdmin) {
      void loadMatrix();
    }

    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Card className="access-control-card" bordered={false}>
      {isLoading ? (
        <div className="access-control-card__loading">
          <Spin size="large" />
        </div>
      ) : (
        <Space direction="vertical" size={20} className="access-control-stack">
          {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

          {roles.map((role) => (
            <Card key={role.role} className="access-role-card" bordered={false}>
              <Space direction="vertical" size={12} className="access-role-card__content">
                <div className="access-role-card__header">
                  <div>
                    <Typography.Title level={4} className="access-role-card__title">
                      {role.label}
                    </Typography.Title>
                    <Typography.Paragraph className="access-role-card__description">
                      {role.description}
                    </Typography.Paragraph>
                  </div>
                  <Tag color="blue">{role.role}</Tag>
                </div>

                <Space size={[8, 8]} wrap>
                  {role.permissions.map((permission) => (
                    <Tag key={permission} color="geekblue">
                      {ACCESS_CONTROL_PERMISSION_LABELS[
                        permission as keyof typeof ACCESS_CONTROL_PERMISSION_LABELS
                      ] ?? permission}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
}

