import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, Avatar, Button, Card, Form, Input, InputNumber, Space, Spin, Tabs, Typography, message } from 'antd';
import {
  updateMeRequest,
  updateMyContactRequest,
  updateMyPasswordRequest,
  uploadAvatarRequest,
  uploadCoverImageRequest,
  type AuthUser,
} from '../../services/authApi';
import { useAuth } from '../context/AuthContext';
import { useAccountProfile } from './useAccountProfile';
import './account.css';

type ProfileFormValues = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  occupation?: string;
  bio?: string;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ContactFormValues = {
  phone?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
};

function syncProfile(profile: AuthUser | null, form: any, contactForm: any) {
  if (!profile) {
    return;
  }

  form.setFieldsValue({
    firstName: profile.firstName ?? undefined,
    lastName: profile.lastName ?? undefined,
    displayName: profile.displayName ?? undefined,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? undefined,
    age: profile.age ?? undefined,
    occupation: profile.occupation ?? undefined,
    bio: profile.bio ?? undefined,
  });

  contactForm.setFieldsValue({
    phone: profile.phone ?? undefined,
    facebookUrl: profile.facebookUrl ?? undefined,
    twitterUrl: profile.twitterUrl ?? undefined,
    linkedinUrl: profile.linkedinUrl ?? undefined,
    websiteUrl: profile.websiteUrl ?? undefined,
    githubUrl: profile.githubUrl ?? undefined,
  });
}

export function SettingsTabs() {
  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [contactForm] = Form.useForm<ContactFormValues>();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const { updateUser } = useAuth();
  const { profile, isLoading, error, setProfile, setError } = useAccountProfile();
  const [messageApi, contextHolder] = message.useMessage();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    syncProfile(profile, profileForm, contactForm);
  }, [contactForm, profile, profileForm]);

  const persistProfile = (nextProfile: AuthUser) => {
    setProfile(nextProfile);
    updateUser(nextProfile);
  };

  const handleProfileSave = async (values: ProfileFormValues) => {
    setError(null);
    setIsSavingProfile(true);

    try {
      const nextProfile = await updateMeRequest(values);
      persistProfile(nextProfile);
      messageApi.success('Profile information updated.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update profile information.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async (values: PasswordFormValues) => {
    setError(null);
    setIsSavingPassword(true);

    try {
      await updateMyPasswordRequest(values);
      passwordForm.resetFields();
      messageApi.success('Password updated.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleContactSave = async (values: ContactFormValues) => {
    setError(null);
    setIsSavingContact(true);

    try {
      const nextProfile = await updateMyContactRequest(values);
      persistProfile(nextProfile);
      messageApi.success('Contact information updated.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update contact information.');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      const nextProfile = await uploadAvatarRequest(file);
      persistProfile(nextProfile);
      messageApi.success('Avatar updated.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to upload avatar.');
    } finally {
      event.target.value = '';
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingCover(true);
    setError(null);

    try {
      const nextProfile = await uploadCoverImageRequest(file);
      persistProfile(nextProfile);
      messageApi.success('Cover image updated.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to upload cover image.');
    } finally {
      event.target.value = '';
      setIsUploadingCover(false);
    }
  };

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.name || 'User';

  return (
    <>
      {contextHolder}
      <Card className="account-surface" bordered={false}>
        {isLoading ? (
          <div className="account-state">
            <Spin size="large" />
          </div>
        ) : (
          <Space direction="vertical" size={24} className="account-stack">
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <Tabs
              className="account-settings__tabs"
              defaultActiveKey="profile"
              items={[
                {
                  key: 'profile',
                  label: 'Profile',
                  children: (
                    <div className="account-settings__panel">
                      <div className="account-settings__header">
                        <div className="account-settings__identity">
                          <Avatar size={88} src={profile?.avatarUrl ?? undefined} className="account-settings__avatar">
                            {fullName.charAt(0).toUpperCase()}
                          </Avatar>
                          <div className="account-settings__identity-copy">
                            <Typography.Text className="account-settings__eyebrow">Account profile</Typography.Text>
                            <Typography.Title level={3} className="account-settings__title">
                              {fullName}
                            </Typography.Title>
                            <Typography.Paragraph className="account-settings__description">
                              Keep your personal information, account identity, and presentation details up to date.
                            </Typography.Paragraph>
                            <Typography.Text type="secondary">{profile?.email}</Typography.Text>
                          </div>
                        </div>
                        <div className="account-settings__header-actions">
                          <Button onClick={() => coverInputRef.current?.click()} loading={isUploadingCover}>
                            Update cover image
                          </Button>
                          <Button onClick={() => avatarInputRef.current?.click()} loading={isUploadingAvatar}>
                            Upload avatar
                          </Button>
                        </div>
                      </div>

                      <input ref={avatarInputRef} hidden type="file" accept="image/*" onChange={handleAvatarChange} />
                      <input ref={coverInputRef} hidden type="file" accept="image/*" onChange={handleCoverChange} />

                      <Card className="account-settings__section" bordered={false}>
                        <div className="account-settings__section-head">
                          <Typography.Title level={4}>Profile</Typography.Title>
                          <Typography.Paragraph>
                            Update your personal information and how your account appears across the LMS.
                          </Typography.Paragraph>
                        </div>

                        <Form<ProfileFormValues>
                          form={profileForm}
                          layout="vertical"
                          requiredMark={false}
                          className="account-form account-form--grid"
                          onFinish={handleProfileSave}
                        >
                          <Form.Item label="First name" name="firstName">
                            <Input placeholder="John" />
                          </Form.Item>
                          <Form.Item label="Last name" name="lastName">
                            <Input placeholder="Doe" />
                          </Form.Item>
                          <Form.Item label="Display name" name="displayName">
                            <Input placeholder="John Doe" />
                          </Form.Item>
                          <Form.Item label="Full name" name="name" rules={[{ required: true, message: 'Full name is required' }]}>
                            <Input placeholder="John Doe" />
                          </Form.Item>
                          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}>
                            <Input placeholder="john@example.com" />
                          </Form.Item>
                          <Form.Item label="Phone number" name="phone">
                            <Input placeholder="+1-202-555-0147" />
                          </Form.Item>
                          <Form.Item label="Age" name="age">
                            <InputNumber min={1} max={120} className="account-form__number" />
                          </Form.Item>
                          <Form.Item label="Occupation" name="occupation">
                            <Input placeholder="Application Developer" />
                          </Form.Item>
                          <Form.Item label="Bio" name="bio" className="account-form__span-full">
                            <Input.TextArea rows={5} placeholder="Share a short biography." />
                          </Form.Item>
                          <div className="account-form__actions account-form__span-full">
                            <Button type="primary" htmlType="submit" loading={isSavingProfile}>
                              Save changes
                            </Button>
                          </div>
                        </Form>
                      </Card>
                    </div>
                  ),
                },
                {
                  key: 'password',
                  label: 'Password',
                  children: (
                    <Card className="account-settings__section" bordered={false}>
                      <div className="account-settings__section-head">
                        <Typography.Title level={4}>Password</Typography.Title>
                        <Typography.Paragraph>
                          Set a new password to keep your account secure.
                        </Typography.Paragraph>
                      </div>
                      <Form<PasswordFormValues>
                        form={passwordForm}
                        layout="vertical"
                        requiredMark={false}
                        className="account-form"
                        onFinish={handlePasswordSave}
                      >
                        <Form.Item
                          label="Current password"
                          name="currentPassword"
                          rules={[{ required: true, message: 'Current password is required' }]}
                        >
                          <Input.Password placeholder="Current password" />
                        </Form.Item>
                        <Form.Item
                          label="New password"
                          name="newPassword"
                          rules={[{ required: true, message: 'New password is required' }, { min: 6, message: 'Use at least 6 characters' }]}
                        >
                          <Input.Password placeholder="New password" />
                        </Form.Item>
                        <Form.Item
                          label="Confirm password"
                          name="confirmPassword"
                          dependencies={['newPassword']}
                          rules={[
                            { required: true, message: 'Please confirm the new password' },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                  return Promise.resolve();
                                }

                                return Promise.reject(new Error('Passwords do not match'));
                              },
                            }),
                          ]}
                        >
                          <Input.Password placeholder="Confirm password" />
                        </Form.Item>
                        <div className="account-form__actions">
                          <Button type="primary" htmlType="submit" loading={isSavingPassword}>
                            Update password
                          </Button>
                        </div>
                      </Form>
                    </Card>
                  ),
                },
                {
                  key: 'contact',
                  label: 'Contact',
                  children: (
                    <Card className="account-settings__section" bordered={false}>
                      <div className="account-settings__section-head">
                        <Typography.Title level={4}>Contact</Typography.Title>
                        <Typography.Paragraph>
                          Keep your contact methods and public links organized in one place.
                        </Typography.Paragraph>
                      </div>
                      <Form<ContactFormValues>
                        form={contactForm}
                        layout="vertical"
                        requiredMark={false}
                        className="account-form account-form--grid"
                        onFinish={handleContactSave}
                      >
                        <Form.Item label="Phone number" name="phone">
                          <Input placeholder="+1-202-555-0147" />
                        </Form.Item>
                        <Form.Item label="Website" name="websiteUrl" rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid URL' }]}>
                          <Input placeholder="https://website.com/" />
                        </Form.Item>
                        <Form.Item label="Facebook" name="facebookUrl" rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid URL' }]}>
                          <Input placeholder="https://facebook.com/" />
                        </Form.Item>
                        <Form.Item label="Twitter" name="twitterUrl" rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid URL' }]}>
                          <Input placeholder="https://twitter.com/" />
                        </Form.Item>
                        <Form.Item label="LinkedIn" name="linkedinUrl" rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid URL' }]}>
                          <Input placeholder="https://linkedin.com/" />
                        </Form.Item>
                        <Form.Item label="GitHub" name="githubUrl" rules={[{ type: 'url', warningOnly: true, message: 'Enter a valid URL' }]}>
                          <Input placeholder="https://github.com/" />
                        </Form.Item>
                        <div className="account-form__actions account-form__span-full">
                          <Button type="primary" htmlType="submit" loading={isSavingContact}>
                            Save contact
                          </Button>
                        </div>
                      </Form>
                    </Card>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Card>
    </>
  );
}
