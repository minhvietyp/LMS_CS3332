import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, Avatar, Button, Card, Form, Input, Space, Spin, Typography } from 'antd';
import { getMeRequest, updateMeRequest, uploadAvatarRequest } from '../../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import './index.css';

interface ProfileFormValues {
  name: string;
  email: string;
}

export function Profile() {
  const [form] = Form.useForm<ProfileFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const profile = await getMeRequest();
        if (!active) {
          return;
        }

        updateUser(profile);
        form.setFieldsValue({
          name: profile.name,
          email: profile.email,
        });
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load profile.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [form, updateUser]);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
      });
    }
  }, [form, user]);

  const handleSave = async (values: ProfileFormValues) => {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const updatedUser = await updateMeRequest(values);
      updateUser(updatedUser);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const updatedUser = await uploadAvatarRequest(file);
      updateUser(updatedUser);
      event.target.value = '';
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload avatar.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="profile-page">
      <section className="profile-page__panel">
        <div className="profile-page__hero">
          <p className="profile-page__eyebrow">Account settings</p>
          <Typography.Title level={1} className="profile-page__title">
            Your profile
          </Typography.Title>
          <Typography.Paragraph className="profile-page__subtitle">
            Update your name, email, and avatar.
          </Typography.Paragraph>
        </div>

        <Card className="profile-card" bordered={false}>
          {isLoading ? (
            <div className="profile-card__loading">
              <Spin size="large" />
            </div>
          ) : (
            <Space direction="vertical" size={24} className="profile-card__content">
              {errorMessage ? <Alert className="profile-form__alert" type="error" showIcon message={errorMessage} /> : null}

              <div className="profile-card__avatar-row">
                <Avatar size={96} src={user?.avatarUrl ?? undefined} className="profile-card__avatar">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </Avatar>

                <div className="profile-card__avatar-copy">
                  <Typography.Title level={4} className="profile-card__section-title">
                    Profile photo
                  </Typography.Title>
                  <Typography.Paragraph className="profile-page__subtitle">
                    Upload a JPG or PNG image up to 5 MB.
                  </Typography.Paragraph>
                  <Space>
                    <Button onClick={handleAvatarClick} loading={isUploading}>
                      Upload avatar
                    </Button>
                  </Space>
                  <input
                    ref={fileInputRef}
                    className="profile-card__file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <Form<ProfileFormValues>
                form={form}
                layout="vertical"
                requiredMark={false}
                onFinish={handleSave}
                className="profile-form"
              >
                <Form.Item label="Full name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
                  <Input size="large" placeholder="Your full name" />
                </Form.Item>

                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Enter a valid email address' },
                  ]}
                >
                  <Input size="large" placeholder="you@example.com" />
                </Form.Item>

                <Button type="primary" htmlType="submit" size="large" loading={isSaving} className="profile-form__submit">
                  Save changes
                </Button>
              </Form>
            </Space>
          )}
        </Card>
      </section>
    </main>
  );
}
