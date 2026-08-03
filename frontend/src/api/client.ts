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
      // token 失效或未认证 → 清除并跳转登录
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        // 保存当前位置以便登录后跳回
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login';
      }
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

export { client as default };
