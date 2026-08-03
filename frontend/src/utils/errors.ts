import type { AxiosError } from 'axios';

/**
 * 从 Axios 错误中提取用户友好的错误消息
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const axiosErr = err as AxiosError<{ detail?: string; message?: string }>;
    // 优先使用后端返回的 detail 字段
    const detail = axiosErr.response?.data?.detail;
    if (detail) return detail;
    // 其次使用 error.message
    if (err.message && err.message !== 'Network Error') return err.message;
  }
  return fallback;
}

/**
 * 判断是否为网络错误（非 HTTP 状态码错误）
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    const axiosErr = err as AxiosError;
    return !axiosErr.response && !!axiosErr.request;
  }
  return false;
}

/**
 * 判断是否为超时错误
 */
export function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    const axiosErr = err as AxiosError;
    return axiosErr.code === 'ECONNABORTED';
  }
  return false;
}
