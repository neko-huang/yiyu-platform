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

// ===== Phase 2 新增类型 =====

/** 活动复盘报告 */
export interface Review {
  id: number;
  event_id: number;
  user_id: number;
  overall_rating: number;
  attendance_rate: number | null;
  highlights: string | null;
  issues: string | null;
  improvements: string | null;
  key_learnings: string | null;
  reuse_suggestion: 'yes' | 'no' | 'maybe';
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreateRequest {
  overall_rating: number;
  attendance_rate?: number;
  highlights?: string;
  issues?: string;
  improvements?: string;
  key_learnings?: string;
  reuse_suggestion: 'yes' | 'no' | 'maybe';
}

export interface ReviewListResponse {
  total: number;
  items: Review[];
}

/** SOP 模板 */
export interface SOPTemplate {
  id: number;
  user_id: number;
  name: string;
  category: string;
  description: string | null;
  content: string | null;
  tags: string[];
  source_event_id: number | null;
  is_public: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface SOPTemplateCreateRequest {
  name: string;
  category: string;
  description?: string;
  content?: string;
  tags?: string[];
  is_public?: boolean;
  source_event_id?: number;
}

export interface SOPTemplateListResponse {
  total: number;
  page: number;
  page_size: number;
  items: SOPTemplate[];
}

/** 财务汇总 */
export interface FinanceSummaryData {
  total_income: number;
  total_expense: number;
  net_balance: number;
  income_by_category: Record<string, number>;
  expense_by_category: Record<string, number>;
  record_count: number;
}

// ===== Phase 3 新增类型 =====

/** AI 文案 */
export interface Copywriting {
  id: number;
  event_id: number;
  user_id: number;
  platform: string;
  content: string | null;
  stage: string;
  created_at: string;
}

/** 相册 */
export interface AlbumPhoto {
  id: number;
  album_id: number;
  user_id: number;
  image_url: string;
  caption: string | null;
  ai_caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Album {
  id: number;
  event_id: number;
  user_id: number;
  title: string;
  description: string | null;
  created_at: string;
  photos: AlbumPhoto[];
}

/** 讨论 */
export interface Discussion {
  id: number;
  event_id: number;
  user_id: number;
  content: string;
  parent_id: number | null;
  is_announcement: boolean;
  created_at: string;
  updated_at: string;
  user_display_name?: string;
}

/** 成就与积分 */
export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  condition_type: string;
  condition_value: number;
  is_limited: boolean;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  earned_at: string;
  achievement?: Achievement;
}

export interface PointTransaction {
  id: number;
  user_id: number;
  points: number;
  tx_type: string;
  description: string | null;
  related_event_id: number | null;
  created_at: string;
}

export interface PointsSummary {
  total_points: number;
  level: number;
  achievements: UserAchievement[];
  recent_transactions: PointTransaction[];
}
