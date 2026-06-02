import { Alert, Avatar, Card, Descriptions, Space, Spin, Tag, Typography } from 'antd';
import { CalendarDays, Mail, Phone, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { useAccountProfile } from './useAccountProfile';
import './account.css';

function formatJoinedDate(value?: string) {
  if (!value) {
    return 'Unavailable';
  }

  return new Date(value).toLocaleString();
}

export function ProfileDetailsView() {
  const { profile, isLoading, error } = useAccountProfile();

  const fullName = useMemo(() => {
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }

    return profile?.name ?? 'User';
  }, [profile?.firstName, profile?.lastName, profile?.name]);

  return (
    <Card className="account-surface" bordered={false}>
      {isLoading ? (
        <div className="account-state">
          <Spin size="large" />
        </div>
      ) : (
        <Space direction="vertical" size={24} className="account-stack">
          {error ? <Alert type="error" showIcon message={error} /> : null}

          <div
            className="account-profile__cover"
            style={profile?.coverImageUrl ? { backgroundImage: `url(${profile.coverImageUrl})` } : undefined}
          >
            <div className="account-profile__overlay" />
            <div className="account-profile__identity">
              <Avatar size={96} src={profile?.avatarUrl ?? undefined} className="account-profile__avatar">
                {fullName.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Typography.Title level={3} className="account-profile__name">
                  {fullName}
                </Typography.Title>
                <Space wrap size={12}>
                  <Tag color="blue">{profile?.role}</Tag>
                  <span className="account-profile__meta">
                    <Mail size={14} /> {profile?.email}
                  </span>
                  {profile?.phone ? (
                    <span className="account-profile__meta">
                      <Phone size={14} /> {profile.phone}
                    </span>
                  ) : null}
                  <span className="account-profile__meta">
                    <CalendarDays size={14} /> Joined {formatJoinedDate(profile?.createdAt)}
                  </span>
                </Space>
              </div>
            </div>
          </div>

          <Descriptions
            column={1}
            bordered={false}
            className="account-profile__details"
            items={[
              { key: 'displayName', label: 'Display name', children: profile?.displayName ?? profile?.name ?? 'Unavailable' },
              { key: 'firstName', label: 'First name', children: profile?.firstName ?? 'Unavailable' },
              { key: 'lastName', label: 'Last name', children: profile?.lastName ?? 'Unavailable' },
              { key: 'occupation', label: 'Occupation', children: profile?.occupation ?? 'Unavailable' },
              { key: 'age', label: 'Age', children: profile?.age ?? 'Unavailable' },
              { key: 'bio', label: 'Biography', children: profile?.bio ?? 'No biography added yet.' },
              {
                key: 'contact',
                label: 'Contact information',
                children: (
                  <Space direction="vertical" size={4}>
                    <span>{profile?.email}</span>
                    <span>{profile?.phone ?? 'Phone not added yet.'}</span>
                  </Space>
                ),
              },
              {
                key: 'links',
                label: 'Social links',
                children: (
                  <Space direction="vertical" size={4}>
                    <span>{profile?.websiteUrl ?? 'Website not added yet.'}</span>
                    <span>{profile?.linkedinUrl ?? 'LinkedIn not added yet.'}</span>
                    <span>{profile?.githubUrl ?? 'GitHub not added yet.'}</span>
                  </Space>
                ),
              },
            ]}
          />

          <div className="account-profile__summary">
            <UserRound size={18} />
            <Typography.Text type="secondary">
              This account view is shared across admin, instructor, and student workspaces.
            </Typography.Text>
          </div>
        </Space>
      )}
    </Card>
  );
}
