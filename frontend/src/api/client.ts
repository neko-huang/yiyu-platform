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
  Review,
  ReviewCreateRequest,
  ReviewListResponse,
  SOPTemplate,
  SOPTemplateCreateRequest,
  SOPTemplateListResponse,
  FinanceSummaryData,
  Copywriting,
  Album,
  AlbumPhoto,
  Discussion,
  Achievement,
  UserAchievement,
  PointTransaction,
  PointsSummary,
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

// ===== Phase 2: Review & SOP Template API =====

/** 获取活动复盘报告 */
export async function getReview(eventId: number): Promise<Review> {
  const res = await client.get<Review>(`/reviews/events/${eventId}/review`);
  return res.data;
}

/** 创建活动复盘报告 */
export async function createReview(eventId: number, data: ReviewCreateRequest): Promise<Review> {
  const res = await client.post<Review>(`/reviews/events/${eventId}/review`, data);
  return res.data;
}

/** 更新活动复盘报告 */
export async function updateReview(eventId: number, data: Partial<ReviewCreateRequest>): Promise<Review> {
  const res = await client.put<Review>(`/reviews/events/${eventId}/review`, data);
  return res.data;
}

/** AI 生成复盘摘要 */
export async function generateAIReviewSummary(eventId: number): Promise<Review> {
  const res = await client.post<Review>(`/reviews/events/${eventId}/review/ai-summary`);
  return res.data;
}

/** 获取我的复盘列表 */
export async function getMyReviews(): Promise<ReviewListResponse> {
  const res = await client.get<ReviewListResponse>('/reviews/my/reviews');
  return res.data;
}

/** 获取 SOP 模板列表 */
export async function getSOPTemplates(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  keyword?: string;
}): Promise<SOPTemplateListResponse> {
  const res = await client.get<SOPTemplateListResponse>('/sop-templates', { params });
  return res.data;
}

/** 获取单个 SOP 模板 */
export async function getSOPTemplate(templateId: number): Promise<SOPTemplate> {
  const res = await client.get<SOPTemplate>(`/sop-templates/${templateId}`);
  return res.data;
}

/** 创建 SOP 模板 */
export async function createSOPTemplate(data: SOPTemplateCreateRequest): Promise<SOPTemplate> {
  const res = await client.post<SOPTemplate>('/sop-templates', data);
  return res.data;
}

/** 更新 SOP 模板 */
export async function updateSOPTemplate(templateId: number, data: Partial<SOPTemplateCreateRequest>): Promise<SOPTemplate> {
  const res = await client.put<SOPTemplate>(`/sop-templates/${templateId}`, data);
  return res.data;
}

/** 删除 SOP 模板 */
export async function deleteSOPTemplate(templateId: number): Promise<void> {
  await client.delete(`/sop-templates/${templateId}`);
}

/** 从活动生成 SOP 模板 */
export async function createSOPTemplateFromEvent(eventId: number): Promise<SOPTemplate> {
  const res = await client.post<SOPTemplate>(`/sop-templates/from-event/${eventId}`);
  return res.data;
}

/** 标记使用 SOP 模板 */
export async function useSOPTemplate(templateId: number): Promise<SOPTemplate> {
  const res = await client.post<SOPTemplate>(`/sop-templates/${templateId}/use`);
  return res.data;
}

/** 获取活动财务汇总 */
export async function getFinanceSummary(eventId: number): Promise<FinanceSummaryData> {
  const res = await client.get<FinanceSummaryData>(`/events/${eventId}/finance/summary`);
  return res.data;
}


// ===== Phase 3: Copywriting, Albums, Discussions, Achievements =====

/** 生成活动文案 */
export async function generateCopywriting(eventId: number, platform: string, stage: string = 'before'): Promise<Copywriting> {
  const res = await client.post<Copywriting>(`/events/${eventId}/copywriting`, { platform, stage });
  return res.data;
}

/** 获取活动文案列表 */
export async function getCopywritings(eventId: number): Promise<Copywriting[]> {
  const res = await client.get<Copywriting[]>(`/events/${eventId}/copywriting`);
  return res.data;
}

/** 创建活动相册 */
export async function createAlbum(eventId: number, data: { title?: string; description?: string }): Promise<Album> {
  const res = await client.post<Album>(`/events/${eventId}/albums`, data);
  return res.data;
}

/** 获取活动相册列表 */
export async function getAlbums(eventId: number): Promise<{ total: number; items: Album[] }> {
  const res = await client.get<{ total: number; items: Album[] }>(`/events/${eventId}/albums`);
  return res.data;
}

/** 上传照片到相册 */
export async function addAlbumPhoto(albumId: number, data: { image_url: string; caption?: string }): Promise<AlbumPhoto> {
  const res = await client.post<AlbumPhoto>(`/albums/${albumId}/photos`, data);
  return res.data;
}

/** 获取活动讨论 */
export async function getDiscussions(eventId: number): Promise<{ total: number; items: Discussion[] }> {
  const res = await client.get<{ total: number; items: Discussion[] }>(`/events/${eventId}/discussions`);
  return res.data;
}

/** 发布讨论 */
export async function createDiscussion(eventId: number, content: string, parentId?: number): Promise<Discussion> {
  const res = await client.post<Discussion>(`/events/${eventId}/discussions`, { content, parent_id: parentId });
  return res.data;
}

/** 获取积分概览 */
export async function getPointsSummary(): Promise<PointsSummary> {
  const res = await client.get<PointsSummary>('/users/me/points');
  return res.data;
}

/** 获取所有成就 */
export async function getAchievements(): Promise<Achievement[]> {
  const res = await client.get<Achievement[]>('/achievements');
  return res.data;
}

/** 获取积分排行榜 */
export async function getLeaderboard(): Promise<Array<{ user_id: number; username: string; display_name: string; total_points: number; rank: number }>> {
  const res = await client.get('/leaderboard');
  return res.data;
}

export { client as default };
