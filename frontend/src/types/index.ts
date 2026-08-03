export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
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
