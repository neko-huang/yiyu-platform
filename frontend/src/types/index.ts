export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
  tags: string[];
  avatar_url?: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  organizer_id: number;
  organizer?: User;
  type: 'offline' | 'online' | 'hybrid';
  category: string;
  start_time: string;
  end_time: string;
  location_name: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  current_participants: number;
  price: number;
  status: string;
  cover_image?: string;
  tags: string[];
}

export interface Registration {
  id: number;
  event_id: number;
  user_id: number;
  user?: User;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in';
  created_at: string;
}

export interface FinanceRecord {
  id: number;
  event_id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AIPlanRequest {
  prompt: string;
  event_type?: string;
  category?: string;
}

export interface AIPlanResponse {
  plan: string;
  suggestions?: string[];
}

export interface DashboardStats {
  total_events: number;
  active_events: number;
  total_registrations: number;
  total_income: number;
}


// ===== Phase 1 新增类型 =====

/** 用户画像（完整信息，本人可见） */
export interface Profile {
  user_id: number;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio: string;
  gender: 'male' | 'female' | 'other' | '';
  birthday: string;
  city: string;
  tags: string[];
  stats: ProfileStats;
}

/** 用户画像统计 */
export interface ProfileStats {
  organized_count: number;
  participated_count: number;
  avg_rating: number;
}

/** 公开用户画像（他人可见，不含敏感信息） */
export interface PublicProfile {
  user_id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio: string;
  tags: string[];
  stats: ProfileStats;
}

/** 更新画像的请求体 */
export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other' | '';
  birthday?: string;
  city?: string;
}

/** 推荐活动（带匹配原因） */
export interface Recommendation extends Event {
  match_reasons: string[];
  match_score: number;
}

/** 搜索参数 */
export interface SearchParams {
  q?: string;
  category?: string;
  city?: string;
  start_date?: string;
  end_date?: string;
  sort?: 'latest' | 'popular';
  page?: number;
  page_size?: number;
}

/** 搜索结果（分页） */
export interface SearchResult {
  items: Event[];
  total: number;
  page: number;
  page_size: number;
}

/** 上传响应 */
export interface UploadResponse {
  url: string;
}
