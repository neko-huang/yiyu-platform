import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';
import client from '../api/client';
import type { AxiosError } from 'axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：检查 localStorage 中的 token 是否有效
  useEffect(() => {
    let isMounted = true;

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
        // 验证 token 是否仍有效
        client.get('/auth/me')
          .then((res) => {
            if (!isMounted) return;
            if (res.data) {
              setUser(res.data);
              localStorage.setItem('user', JSON.stringify(res.data));
            }
          })
          .catch((err) => {
            if (!isMounted) return;
            const axiosErr = err as AxiosError;
            // 仅在确认 401（token 失效）时清除，网络错误等其他情况保留缓存用户
            if (axiosErr.response?.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
            // 其他错误（网络问题等）保留现有登录态，不踢出用户
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (isMounted) setLoading(false);
      }
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 监听 401 拦截器派发的登出事件（替代 window.location 硬跳转）
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await client.post('/auth/login', {
      username: data.username,
      password: data.password,
    });

    const { access_token, user: userInfo } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userInfo));
    setToken(access_token);
    setUser(userInfo);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await client.post('/auth/register', data);
    const { access_token, user: userInfo } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userInfo));
    setToken(access_token);
    setUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
