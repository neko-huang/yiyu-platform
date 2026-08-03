import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import type { Event, Registration, FinanceRecord } from '../types';
import { statusLabels, eventStatusLabels } from '../utils/constants';

type Tab = 'registrations' | 'finance' | 'settings';

export default function EventManage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);

  const [activeTab, setActiveTab] = useState<Tab>('registrations');
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Finance form
  const [finForm, setFinForm] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: 0,
    description: '',
  });
  const [finSubmitting, setFinSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventRes, regRes, finRes] = await Promise.all([
        client.get(`/events/${id}`),
        client.get(`/events/${id}/registrations`),
        client.get(`/events/${id}/finance`),
      ]);
      setEvent(eventRes.data);
      setRegistrations(regRes.data);
      setFinanceRecords(finRes.data);
    } catch {
      // 模拟数据
      setEvent({
        id: eventId,
        title: '周末香山徒步登山活动',
        description: '金秋时节，香山红叶正盛。',
        organizer_id: 1,
        type: 'offline',
        category: '户外',
        start_time: '2026-08-10T08:00:00',
        end_time: '2026-08-10T16:00:00',
        location_name: '北京香山公园',
        latitude: 39.9929,
        longitude: 116.1883,
        max_participants: 50,
        current_participants: 32,
        price: 50,
        status: 'published',
        tags: ['徒步', '登山'],
      });
      setRegistrations([
        { id: 1, event_id: eventId, user_id: 10, status: 'approved', created_at: '2026-08-01T10:00:00', user: { id: 10, username: 'hiker01', email: 'h1@test.com', display_name: '山间行者', role: 'user', tags: ['户外'] } },
        { id: 2, event_id: eventId, user_id: 11, status: 'pending', created_at: '2026-08-02T14:30:00', user: { id: 11, username: 'nature', email: 'n@test.com', display_name: '自然之友', role: 'user', tags: ['摄影'] } },
        { id: 3, event_id: eventId, user_id: 12, status: 'approved', created_at: '2026-08-03T09:15:00', user: { id: 12, username: 'climber', email: 'c@test.com', display_name: '攀岩达人', role: 'user', tags: ['登山'] } },
        { id: 4, event_id: eventId, user_id: 13, status: 'checked_in', created_at: '2026-08-03T11:00:00', user: { id: 13, username: 'walker', email: 'w@test.com', display_name: '徒步爱好者', role: 'user', tags: ['徒步'] } },
        { id: 5, event_id: eventId, user_id: 14, status: 'rejected', created_at: '2026-08-04T08:00:00', user: { id: 14, username: 'newbie', email: 'nb@test.com', display_name: '新手小白', role: 'user', tags: [] } },
      ]);
      setFinanceRecords([
        { id: 1, event_id: eventId, type: 'income', category: '报名费', amount: 1600, description: '32人报名费', created_at: '2026-08-01T00:00:00' },
        { id: 2, event_id: eventId, type: 'expense', category: '场地费', amount: 500, description: '香山公园门票', created_at: '2026-08-01T00:00:00' },
        { id: 3, event_id: eventId, type: 'expense', category: '补给', amount: 200, description: '矿泉水和能量棒', created_at: '2026-08-02T00:00:00' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id, eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegStatus = async (regId: number, status: Registration['status']) => {
    const actionKey = `reg-${regId}-${status}`;
    setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
    try {
      await client.patch(`/registrations/${regId}`, { status });
    } catch {
      // 模拟更新
    }
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status } : r)),
    );
    setActionLoading((prev) => {
      const next = { ...prev };
      delete next[actionKey];
      return next;
    });
  };

  const handleAddFinance = async (e: FormEvent) => {
    e.preventDefault();
    if (finSubmitting) return; // 防重复提交
    if (!finForm.category || finForm.amount <= 0) return;

    setFinSubmitting(true);

    const newRecord: FinanceRecord = {
      id: Date.now(),
      event_id: eventId,
      type: finForm.type,
      category: finForm.category,
      amount: finForm.amount,
      description: finForm.description,
      created_at: new Date().toISOString(),
    };

    try {
      await client.post(`/events/${id}/finance`, finForm);
    } catch {
      // 后端未启动 - 模拟添加
    }
    setFinanceRecords((prev) => [...prev, newRecord]);
    setFinForm({ type: 'income', category: '', amount: 0, description: '' });
    setFinSubmitting(false);
  };

  const handleUpdateEventStatus = async (status: string) => {
    const actionKey = `status-${status}`;
    setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
    try {
      await client.patch(`/events/${id}`, { status });
    } catch {
      // 模拟更新
    }
    setEvent((prev) => (prev ? { ...prev, status } : prev));
    setActionLoading((prev) => {
      const next = { ...prev };
      delete next[actionKey];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">{error || '活动不存在'}</p>
        <Link to="/" className="btn-primary inline-flex">返回首页</Link>
      </div>
    );
  }

  const totalIncome = financeRecords.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalExpense = financeRecords.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'registrations', label: '报名管理', icon: '👥' },
    { key: 'finance', label: '财务管理', icon: '💰' },
    { key: 'settings', label: '活动设置', icon: '⚙️' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2" aria-label="面包屑导航">
          <Link to="/" className="hover:text-primary-600">首页</Link>
          <span className="mx-2">/</span>
          <Link to={`/events/${id}`} className="hover:text-primary-600">{event.title}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">管理</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">活动管理 - {event.title}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5" aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'registrations' && (
        <div>
          {/* Stats - 移动端 2 列，桌面端 4 列 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {(['pending', 'approved', 'checked_in', 'rejected'] as const).map((status) => {
              const count = registrations.filter((r) => r.status === status).length;
              return (
                <div key={status} className="card p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-500 mt-1">{statusLabels[status]?.text}</p>
                </div>
              );
            })}
          </div>

          {/* Registrations table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 hidden sm:table-cell">报名时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                          {reg.user?.display_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{reg.user?.display_name || `用户${reg.user_id}`}</p>
                          <p className="text-xs text-gray-400">{reg.user?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {new Date(reg.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`tag ${statusLabels[reg.status]?.color}`}>
                        {statusLabels[reg.status]?.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {reg.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleRegStatus(reg.id, 'approved')}
                              disabled={actionLoading[`reg-${reg.id}-approved`]}
                              className="text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded disabled:opacity-50"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleRegStatus(reg.id, 'rejected')}
                              disabled={actionLoading[`reg-${reg.id}-rejected`]}
                              className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                            >
                              拒绝
                            </button>
                          </>
                        )}
                        {reg.status === 'approved' && (
                          <button
                            onClick={() => handleRegStatus(reg.id, 'checked_in')}
                            disabled={actionLoading[`reg-${reg.id}-checked_in`]}
                            className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            签到
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {registrations.length === 0 && (
              <div className="text-center py-12 text-gray-400">暂无报名记录</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-500">总收入</p>
              <p className="text-2xl font-bold text-green-600 mt-1">¥{totalIncome}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">总支出</p>
              <p className="text-2xl font-bold text-red-600 mt-1">¥{totalExpense}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">结余</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">¥{totalIncome - totalExpense}</p>
            </div>
          </div>

          {/* Add finance record */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">添加收支记录</h3>
            <form onSubmit={handleAddFinance} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={finForm.type}
                onChange={(e) => setFinForm({ ...finForm, type: e.target.value as 'income' | 'expense' })}
                className="input-field"
                aria-label="收支类型"
              >
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
              <input
                type="text"
                value={finForm.category}
                onChange={(e) => setFinForm({ ...finForm, category: e.target.value })}
                className="input-field"
                placeholder="类别（如报名费、场地费）"
                aria-label="类别"
                required
              />
              <input
                type="number"
                value={finForm.amount || ''}
                onChange={(e) => setFinForm({ ...finForm, amount: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="金额"
                min="0"
                aria-label="金额"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={finForm.description}
                  onChange={(e) => setFinForm({ ...finForm, description: e.target.value })}
                  className="input-field flex-1"
                  placeholder="备注"
                  aria-label="备注"
                />
                <button type="submit" disabled={finSubmitting} className="btn-primary whitespace-nowrap disabled:opacity-50">
                  {finSubmitting ? '添加中...' : '添加'}
                </button>
              </div>
            </form>
          </div>

          {/* Finance records */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类别</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 hidden sm:table-cell">备注</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 hidden sm:table-cell">日期</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {financeRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`tag ${rec.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {rec.type === 'income' ? '收入' : '支出'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{rec.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{rec.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{new Date(rec.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className={`px-4 py-3 text-right font-medium ${rec.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {rec.type === 'income' ? '+' : '-'}¥{rec.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {financeRecords.length === 0 && (
              <div className="text-center py-12 text-gray-400">暂无财务记录</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Event info */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">活动信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">标题</p>
                <p className="font-medium text-gray-900 mt-1">{event.title}</p>
              </div>
              <div>
                <p className="text-gray-500">分类</p>
                <p className="font-medium text-gray-900 mt-1">{event.category}</p>
              </div>
              <div>
                <p className="text-gray-500">开始时间</p>
                <p className="font-medium text-gray-900 mt-1">{new Date(event.start_time).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <p className="text-gray-500">结束时间</p>
                <p className="font-medium text-gray-900 mt-1">{new Date(event.end_time).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <p className="text-gray-500">地点</p>
                <p className="font-medium text-gray-900 mt-1">{event.location_name}</p>
              </div>
              <div>
                <p className="text-gray-500">状态</p>
                <p className="font-medium text-gray-900 mt-1">
                  <span className={`tag ${eventStatusLabels[event.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {eventStatusLabels[event.status]?.text || event.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">活动状态管理</h3>
            <div className="flex flex-wrap gap-3">
              {event.status !== 'published' && (
                <button
                  onClick={() => handleUpdateEventStatus('published')}
                  disabled={actionLoading['status-published']}
                  className="btn-primary disabled:opacity-50"
                >
                  📢 发布活动
                </button>
              )}
              {event.status === 'published' && (
                <button
                  onClick={() => handleUpdateEventStatus('ended')}
                  disabled={actionLoading['status-ended']}
                  className="btn-danger disabled:opacity-50"
                >
                  🔚 结束活动
                </button>
              )}
              <Link to={`/events/${id}`} className="btn-secondary">
                查看活动详情
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                返回仪表盘
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
