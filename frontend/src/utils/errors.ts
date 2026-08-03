import type { AxiosError } from 'axios';

/**
 * 从 Axios 错误中提取用户友好的错误消息
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const axiosErr = err as AxiosError<{
      detail?: string | Array<{ msg?: string; loc?: string[] }>;
      message?: string;
    }>;

    const data = axiosErr.response?.data;
    if (data) {
      // FastAPI 422 验证错误: detail 是数组
      if (Array.isArray(data.detail)) {
        const messages = data.detail
          .map((item) => item.msg)
          .filter(Boolean);
        if (messages.length > 0) return messages.join('；');
      }
      // 普通错误: detail 是字符串
      if (typeof data.detail === 'string' && data.detail.trim()) {
        return data.detail;
      }
      // message 字段
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }
      // 500 等服务器错误
      const status = axiosErr.response.status;
      if (status === 500) return '服务器内部错误，请稍后重试';
      if (status === 502 || status === 503) return '服务暂时不可用，请稍后重试';
      if (status === 409) return '用户名或邮箱已被注册';
      if (status === 401) return '用户名或密码错误';
    }

    // 网络错误
    if (err.message === 'Network Error') return '无法连接到服务器，请确认后端已启动';
    // 超时
    if (err.message?.includes('timeout')) return '请求超时，请检查网络后重试';
    // 其他
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
