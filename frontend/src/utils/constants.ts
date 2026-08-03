import type { Registration } from '../types';

/** 报名状态标签映射（跨页面共享） */
export const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'bg-amber-100 text-amber-700' },
  approved: { text: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { text: '已拒绝', color: 'bg-red-100 text-red-700' },
  checked_in: { text: '已签到', color: 'bg-blue-100 text-blue-700' },
};

/** 活动状态标签映射 */
export const eventStatusLabels: Record<string, { text: string; color: string }> = {
  published: { text: '已发布', color: 'bg-green-100 text-green-700' },
  draft: { text: '草稿', color: 'bg-gray-100 text-gray-700' },
  ended: { text: '已结束', color: 'bg-red-100 text-red-700' },
};

/** 分类颜色映射 */
export const categoryColors: Record<string, string> = {
  户外: 'bg-green-100 text-green-700',
  音乐: 'bg-purple-100 text-purple-700',
  读书: 'bg-amber-100 text-amber-700',
  运动: 'bg-red-100 text-red-700',
  讲座: 'bg-blue-100 text-blue-700',
  科技: 'bg-indigo-100 text-indigo-700',
  美食: 'bg-orange-100 text-orange-700',
  艺术: 'bg-pink-100 text-pink-700',
};

/** 活动分类列表 */
export const categories = ['全部', '户外', '音乐', '读书', '运动', '讲座', '科技', '美食', '艺术'];

/** 创建活动用分类列表（不含"全部"） */
export const createCategories = ['户外', '音乐', '读书', '运动', '讲座', '科技', '美食', '艺术', '其他'];

/** 活动类型选项 */
export const eventTypes = [
  { value: 'offline' as const, label: '线下' },
  { value: 'online' as const, label: '线上' },
  { value: 'hybrid' as const, label: '混合（线上+线下）' },
];

/** 格式化日期为 "M月D日 HH:MM" */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '待定';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '待定';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/** 获取活动类型中文标签 */
export function getEventTypeLabel(type: string): string {
  return type === 'offline' ? '线下' : type === 'online' ? '线上' : '混合';
}

/** 类型守卫：过滤掉 undefined 元素 */
export function filterTruthy<T>(arr: (T | undefined | null)[]): T[] {
  return arr.filter((item): item is T => item !== undefined && item !== null);
}

/** Registration 类型（含可选 event 字段，用于 Profile 页解析） */
export interface RegistrationWithEvent extends Registration {
  event?: import('../types').Event;
}
