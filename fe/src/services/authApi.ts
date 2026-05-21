import axios, { AxiosError } from 'axios';
import type { UserRole } from '../components/context/AuthContext';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const rawAuth = localStorage.getItem('lms.auth');

  if (!rawAuth) {
    return config;
  }

  try {
    const storedAuth = JSON.parse(rawAuth) as { token?: string };
    if (storedAuth.token) {
      config.headers.Authorization = `Bearer ${storedAuth.token}`;
    }
  } catch {
    localStorage.removeItem('lms.auth');
  }

  return config;
});

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  phone?: string | null;
  age?: number | null;
  occupation?: string | null;
  bio?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserListItem extends AuthUser {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
  isActive?: boolean;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatarUrl?: string;
  isActive?: boolean;
  role?: UserRole;
}

export interface RoleAccessSummary {
  role: UserRole;
  label: string;
  description: string;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export type RegisterResponse = LoginResponse;

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  age?: number;
  occupation?: string;
  bio?: string;
  coverImageUrl?: string;
}

export interface UpdateContactRequest {
  phone?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileResponse {
  user: AuthUser;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedApiEnvelope<T> extends ApiEnvelope<T> {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? 'Login failed. Please try again.';
  }

  return 'Login failed. Please try again.';
}

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function registerRequest(payload: RegisterRequest): Promise<RegisterResponse> {
  try {
    const response = await apiClient.post<ApiEnvelope<RegisterResponse>>('/auth/register', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  try {
    await apiClient.post<ApiEnvelope<null>>('/auth/logout', { refreshToken });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function forgotPasswordRequest(payload: ForgotPasswordRequest): Promise<void> {
  try {
    await apiClient.post<ApiEnvelope<null>>('/auth/forgot-password', payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function resetPasswordRequest(payload: ResetPasswordRequest): Promise<void> {
  try {
    await apiClient.post<ApiEnvelope<null>>('/auth/reset-password', payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getMeRequest(): Promise<AuthUser> {
  try {
    const response = await apiClient.get<ApiEnvelope<AuthUser>>('/users/me');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getMyProfileRequest(): Promise<AuthUser> {
  try {
    const response = await apiClient.get<ApiEnvelope<AuthUser>>('/users/me/profile');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateMeRequest(payload: UpdateProfileRequest): Promise<AuthUser> {
  try {
    const response = await apiClient.patch<ApiEnvelope<AuthUser>>('/users/me', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateMyContactRequest(payload: UpdateContactRequest): Promise<AuthUser> {
  try {
    const response = await apiClient.patch<ApiEnvelope<AuthUser>>('/users/me/contact', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateMyPasswordRequest(payload: ChangePasswordRequest): Promise<void> {
  try {
    await apiClient.patch<ApiEnvelope<null>>('/users/me/password', payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function uploadAvatarRequest(file: File): Promise<AuthUser> {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.patch<ApiEnvelope<AuthUser>>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function uploadCoverImageRequest(file: File): Promise<AuthUser> {
  try {
    const formData = new FormData();
    formData.append('cover', file);

    const response = await apiClient.patch<ApiEnvelope<AuthUser>>('/users/me/cover-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function listUsersRequest(
  options: boolean | {
    includeDeleted?: boolean;
    deleted?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
  } = false,
): Promise<{ data: UserListItem[]; meta?: PaginatedApiEnvelope<UserListItem[]>['meta'] }> {
  try {
    const params = typeof options === 'boolean' ? { includeDeleted: options } : options;
    const response = await apiClient.get<PaginatedApiEnvelope<UserListItem[]>>('/users', {
      params,
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function softDeleteUserRequest(userId: string): Promise<void> {
  try {
    await apiClient.delete(`/users/${userId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function createUserRequest(payload: CreateUserRequest): Promise<UserListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<UserListItem>>('/users', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getUserByIdRequest(userId: string): Promise<UserListItem> {
  try {
    const response = await apiClient.get<ApiEnvelope<UserListItem>>(`/users/${userId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function restoreUserRequest(userId: string): Promise<void> {
  try {
    await apiClient.post(`/users/${userId}/restore`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateUserRequest(userId: string, payload: UpdateUserRequest): Promise<UserListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<UserListItem>>(`/users/${userId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getRoleAccessMatrixRequest(): Promise<RoleAccessSummary[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<RoleAccessSummary[]>>('/access-control/roles');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
