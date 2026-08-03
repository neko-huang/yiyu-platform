import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动携带 JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：统一处理 401/403
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // token 失效 → 清除本地存储
      // 不在此处做 window.location 硬跳转，由 AuthContext / ProtectedRoute 通过 React Router 软跳转
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 派发自定义事件，通知 AuthContext 更新状态
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    // 403 由各页面自行处理（显示权限提示），不在这里强制跳转

    return Promise.reject(error);
  },
);

/**
 * 带重试的 GET 请求（仅对网络错误/超时重试，不对 HTTP 状态码错误重试）
 */
export async function getWithRetry<T>(url: string, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await client.get<T>(url);
      return res.data;
    } catch (err) {
      lastError = err;
      const axiosErr = err as AxiosError;
      // 仅对无 response 的网络错误或超时重试
      const isRetryable = !axiosErr.response;
      if (!isRetryable || attempt === maxRetries) break;
      // 指数退避
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

// ===== Phase 1 API 方法 =====
import type {
  Profile,
  PublicProfile,
  UpdateProfileRequest,
  Recommendation,
  SearchResult,
  SearchParams,
  UploadResponse,
} from '../types';

/** 获取当前用户画像 */
export async function getProfile(): Promise<Profile> {
  const res = await client.get<Profile>('/profiles/me');
  return res.data;
}

/** 更新当前用户画像 */
export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  const res = await client.put<Profile>('/profiles/me', data);
  return res.data;
}

/** 获取其他用户的公开画像 */
export async function getUserProfile(userId: number): Promise<PublicProfile> {
  const res = await client.get<PublicProfile>(`/profiles/${userId}`);
  return res.data;
}

/** 添加兴趣标签 */
export async function addInterest(tag: string): Promise<Profile> {
  const res = await client.post<Profile>('/profiles/me/interests', { tag });
  return res.data;
}

/** 移除兴趣标签 */
export async function removeInterest(tag: string): Promise<Profile> {
  const res = await client.delete<Profile>(`/profiles/me/interests/${encodeURIComponent(tag)}`);
  return res.data;
}

/** 上传头像（FormData） */
export async function uploadAvatar(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<UploadResponse>('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/** 上传图片（FormData） */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<UploadResponse>('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/** 搜索活动 */
export async function searchEvents(params: SearchParams): Promise<SearchResult> {
  const res = await client.get<SearchResult>('/events/search', { params });
  return res.data;
}

/** 获取推荐活动 */
export async function getRecommendations(): Promise<Recommendation[]> {
  const res = await client.get<{ total: number; items: Recommendation[]; strategy: string }>('/events/recommendations');
  return res.data.items || [];
}

export { client as default };
