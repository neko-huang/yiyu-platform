import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import type { Event, DashboardStats } from '../types';

// 模拟财务数据
const mockFinanceData = {
  total_income: 18650,
  total_expense: 12300,
  income_by_category: { '报名费': 12000, '赞助': 5000, '其他': 1650 },
  expense_by_category: { '场地费': 4500, '物料': 3200, '餐饮': 2800, '人工': 1200, '其他': 600 },
};

// 模拟数据
const mockStats: DashboardStats = {
  total_events: 12,
  active_events: 5,
  total_registrations: 348,
  total_income: 18650,
};

const mockRecentEvents: Event[] = [
  { id: 1, title: '周末香山徒步登山活动', description: '', organizer_id: 1, type: 'offline', category: '户外', start_time: '2026-08-10T08:00:00', end_time: '2026-08-10T16:00:00', location_name: '北京', latitude: 39.9, longitude: 116.4, max_participants: 50, current_participants: 32, price: 50, status: 'published', tags: [] },
  { id: 2, title: '城市民谣音乐之夜', description: '', organizer_id: 1, type: 'offline', category: '音乐', start_time: '2026-08-15T19:30:00', end_time: '2026-08-15T22:00:00', location_name: '上海', latitude: 31.2, longitude: 121.5, max_participants: 100, current_participants: 67, price: 88, status: 'published', tags: [] },
  { id: 3, title: '《人类简史》读书分享会', description: '', organizer_id: 1, type: 'hybrid', category: '读书', start_time: '2026-08-12T14:00:00', end_time: '2026-08-12T17:00:00', location_name: '杭州', latitude: 30.3, longitude: 120.2, max_participants: 30, current_participants: 30, price: 0, status: 'published', tags: [] },
  { id: 4, title: 'AI技术讲座（已结束）', description: '', organizer_id: 1, type: 'online', category: '讲座', start_time: '2026-07-28T19:00:00', end_time: '2026-07-28T21:00:00', location_name: '线上', latitude: 0, longitude: 0, max_participants: 200, current_participants: 156, price: 0, status: 'ended', tags: [] },
  { id: 5, title: '夏日烧烤派对（草稿）', description: '', organizer_id: 1, type: 'offline', category: '美食', start_time: '2026-08-25T11:00:00', end_time: '2026-08-25T20:00:00', location_name: '北京', latitude: 40.3, longitude: 116.6, max_participants: 40, current_participants: 0, price: 158, status: 'draft', tags: [] },
];

const statusColors: Record<string, string> = {
  published: 'bg-green-400',
  draft: 'bg-gray-400',
  ended: 'bg-red-400',
};

const statusLabels: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  ended: '已结束',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [financeData, setFinanceData] = useState(mockFinanceData);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes] = await Promise.all([
        client.get('/dashboard/stats'),
        client.get('/events', { params: { limit: 5 } }),
      ]);
      setStats(statsRes.data);
      setRecentEvents(eventsRes.data.items || []);
    } catch {
      setStats(mockStats);
      setRecentEvents(mockRecentEvents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 计算状态分布
  const statusCounts = recentEvents.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalForChart = Object.values(statusCounts).reduce((s, v) => s + v, 0) || 1;

  const statCards = [
    { label: '活动总数', value: stats.total_events, icon: '📊', color: 'from-blue-500 to-blue-600' },
    { label: '进行中活动', value: stats.active_events, icon: '🔥', color: 'from-green-500 to-green-600' },
    { label: '总报名人数', value: stats.total_registrations, icon: '👥', color: 'from-purple-500 to-purple-600' },
    { label: '总收入', value: `¥${stats.total_income.toLocaleString()}`, icon: '💰', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理仪表盘</h1>
          <p className="text-gray-500 text-sm mt-1">平台运营数据总览</p>
        </div>
        <Link to="/events/create" className="btn-primary">
          + 创建活动
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card) => (
              <div key={card.label} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent events */}
            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">最近活动</h2>
                <Link to="/" className="text-sm text-primary-600 hover:underline">查看全部</Link>
              </div>
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${statusColors[event.status] || 'bg-gray-400'}`} />
                      <div>
                        <Link to={`/events/${event.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600">
                          {event.title}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(event.start_time).toLocaleDateString('zh-CN')} · {event.location_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 hidden sm:block">
                        {event.current_participants}/{event.max_participants}人
                      </span>
                      <span className={`tag ${statusColors[event.status] ? `${statusColors[event.status]} bg-opacity-20` : 'bg-gray-100'} text-gray-700`}>
                        {statusLabels[event.status] || event.status}
                      </span>
                      <Link
                        to={`/events/${event.id}/manage`}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        管理
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status distribution */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">活动状态分布</h2>
              {/* Bar chart */}
              <div className="space-y-4">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const percentage = (count / totalForChart) * 100;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{statusLabels[status] || status}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${statusColors[status] || 'bg-gray-400'} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Donut chart simulation */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">总体占比</p>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      {Object.entries(statusCounts).map(([status, count], idx) => {
                        const percentage = (count / totalForChart) * 100;
                        const offset = Object.entries(statusCounts)
                          .slice(0, idx)
                          .reduce((s, [, c]) => s + (c / totalForChart) * 100, 0);
                        const colors: Record<string, string> = {
                          published: '#22c55e',
                          draft: '#9ca3af',
                          ended: '#ef4444',
                        };
                        return (
                          <circle
                            key={status}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={colors[status] || '#9ca3af'}
                            strokeWidth="12"
                            strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                            strokeDashoffset={-offset * 2.51}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-900">{totalForChart}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2 text-xs">
                        <span className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-400'}`} />
                        <span className="text-gray-600">{statusLabels[status] || status}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Finance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Income vs Expense bar chart */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">财务概览</h2>
              <div className="space-y-4">
                {/* Income bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-green-600 font-medium">总收入</span>
                    <span className="font-bold text-green-600">¥{financeData.total_income.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-500 h-4 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((financeData.total_income / Math.max(financeData.total_income, financeData.total_expense)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Expense bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-red-600 font-medium">总支出</span>
                    <span className="font-bold text-red-600">¥{financeData.total_expense.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-500 h-4 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((financeData.total_expense / Math.max(financeData.total_income, financeData.total_expense)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Net balance */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">净收入</span>
                    <span className={`text-lg font-bold ${financeData.total_income - financeData.total_expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ¥{(financeData.total_income - financeData.total_expense).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">收入构成</h3>
                <div className="space-y-2">
                  {Object.entries(financeData.income_by_category).map(([cat, amount]) => {
                    const pct = (amount / financeData.total_income) * 100;
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 truncate">{cat}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-16 text-right">¥{amount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Expense breakdown pie chart */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">支出构成</h2>
              <div className="flex items-center gap-6">
                {/* SVG pie chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    {(() => {
                      const entries = Object.entries(financeData.expense_by_category);
                      const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
                      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
                      let offset = 0;
                      return entries.map(([cat, amount], idx) => {
                        const pct = (amount / total) * 100;
                        const dashLen = pct * 2.51;
                        const el = (
                          <circle
                            key={cat}
                            cx="50" cy="50" r="40"
                            fill="none"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="14"
                            strokeDasharray={`${dashLen} ${251 - dashLen}`}
                            strokeDashoffset={-offset * 2.51}
                          />
                        );
                        offset += pct;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">¥{(financeData.total_expense / 1000).toFixed(1)}k</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-2 flex-1">
                  {Object.entries(financeData.expense_by_category).map(([cat, amount], idx) => {
                    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500'];
                    const pct = ((amount / financeData.total_expense) * 100).toFixed(1);
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                          <span className="text-gray-600">{cat}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-gray-900">¥{amount.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
