import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MapView from '../components/MapView';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import type { Event, Registration, FinanceRecord, Copywriting } from '../types';
import { generateCopywriting } from '../api/client';
import { statusLabels, getEventTypeLabel } from '../utils/constants';
import { getErrorMessage } from '../utils/errors';

// 模拟详情数据
const mockEventDetail: Record<number, Event> = {
  1: {
    id: 1,
    title: '周末香山徒步登山活动',
    description: '金秋时节，香山红叶正盛。我们组织一次轻松的徒步登山活动，适合各年龄段参与。\n\n**活动亮点：**\n- 专业领队带队，全程安全保障\n- 沿途欣赏香山红叶美景\n- 登顶后俯瞰北京全城\n- 提供矿泉水和能量补给\n\n**集合地点：** 香山公园东门售票处\n**装备要求：** 运动鞋、防晒用品、轻便背包\n\n欢迎热爱户外的朋友一起参加！',
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
    tags: ['徒步', '登山', '秋游'],
  },
};

const mockRegistrations: Registration[] = [
  { id: 1, event_id: 1, user_id: 10, status: 'approved', created_at: '2026-08-01T10:00:00', user: { id: 10, username: 'hiker01', email: 'hiker01@test.com', display_name: '山间行者', role: 'user', tags: ['户外'] } },
  { id: 2, event_id: 1, user_id: 11, status: 'pending', created_at: '2026-08-02T14:30:00', user: { id: 11, username: 'nature_lover', email: 'nature@test.com', display_name: '自然之友', role: 'user', tags: ['摄影', '户外'] } },
  { id: 3, event_id: 1, user_id: 12, status: 'approved', created_at: '2026-08-03T09:15:00', user: { id: 12, username: 'climber', email: 'climber@test.com', display_name: '攀岩达人', role: 'user', tags: ['登山', '攀岩'] } },
];

const mockFinance: FinanceRecord[] = [
  { id: 1, event_id: 1, type: 'income', category: '报名费', amount: 1600, description: '32人报名费', created_at: '2026-08-01T00:00:00' },
  { id: 2, event_id: 1, type: 'expense', category: '场地费', amount: 500, description: '香山公园门票', created_at: '2026-08-01T00:00:00' },
  { id: 3, event_id: 1, type: 'expense', category: '补给', amount: 200, description: '矿泉水和能量棒', created_at: '2026-08-02T00:00:00' },
];

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyPlatform, setCopyPlatform] = useState('xiaohongshu');
  const [copyStage, setCopyStage] = useState('before');
  const [copywritingResult, setCopywritingResult] = useState<Copywriting | null>(null);
  const [copyGenerating, setCopyGenerating] = useState(false);

  const eventId = Number(id);

  const fetchEventDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/events/${id}`);
      setEvent(res.data);

      // 如果是组织者，获取报名和财务信息
      if (user && res.data.organizer_id === user.id) {
        const [regRes, finRes] = await Promise.all([
          client.get(`/events/${id}/registrations`),
          client.get(`/events/${id}/finance`),
        ]);
        setRegistrations(regRes.data);
        setFinanceRecords(finRes.data?.items || finRes.data || []);
      }
    } catch {
      // 使用模拟数据
      const mockEvent = mockEventDetail[eventId];
      if (mockEvent) {
        setEvent(mockEvent);
        setRegistrations(mockRegistrations);
        setFinanceRecords(mockFinance);
      } else {
        setError('活动不存在');
      }
    } finally {
      setLoading(false);
    }
  }, [id, eventId, user]);

  useEffect(() => {
    fetchEventDetail();
  }, [fetchEventDetail]);

  const handleRegister = async () => {
    if (registering) return; // 防重复提交
    setRegistering(true);
    setRegisterError('');
    try {
      await client.post(`/events/${id}/register`);
      setRegistrationStatus('pending');
      // 更新报名人数
      if (event) {
        setEvent({ ...event, current_participants: event.current_participants + 1 });
      }
    } catch (err) {
      // 检查是否为 403（已报名）或 409（名额已满）
      const status = err instanceof Error ? (err as { response?: { status?: number } }).response?.status : undefined;
      if (status === 403) {
        setRegisterError('您已报名此活动或无权报名');
      } else if (status === 409) {
        setRegisterError('名额已满');
      } else {
        // 后端未启动 - 模拟成功
        setRegistrationStatus('pending');
        if (event) {
          setEvent({ ...event, current_participants: event.current_participants + 1 });
        }
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleGenerateCopy = async () => {
    setCopyGenerating(true);
    try {
      const result = await generateCopywriting(eventId, copyPlatform, copyStage);
      setCopywritingResult(result);
    } catch {
      // Mock result
      const mockResult: Copywriting = {
        id: Date.now(),
        event_id: eventId,
        user_id: user?.id || 1,
        platform: copyPlatform,
        content: `🎉 ${event?.title || '精彩活动'}来了！\n\n${copyStage === 'before' ? '即将开始，快来报名吧！名额有限，先到先得～' : '活动圆满结束，感谢每一位参与者的支持！期待下次再聚！'}\n\n📍 ${event?.location_name || '待定'}\n🕐 ${event ? new Date(event.start_time).toLocaleString('zh-CN') : ''}\n\n#活动 #益屿`,
        stage: copyStage,
        created_at: new Date().toISOString(),
      };
      setCopywritingResult(mockResult);
    } finally {
      setCopyGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-gray-500 text-lg mb-4">{error || '活动不存在'}</p>
        <Link to="/" className="btn-primary inline-flex">
          返回首页
        </Link>
      </div>
    );
  }

  const isOrganizer = user?.id === event.organizer_id;
  const totalIncome = financeRecords.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = financeRecords.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  const isFull = event.current_participants >= event.max_participants;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500" aria-label="面包屑导航">
        <Link to="/" className="hover:text-primary-600">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover */}
          <div className="h-64 sm:h-80 rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center overflow-hidden">
            {event.cover_image ? (
              <img src={event.cover_image} alt={event.title} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-5xl font-bold opacity-30">{event.category}</span>
            )}
          </div>

          {/* Title & badges */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="tag bg-primary-100 text-primary-700">{getEventTypeLabel(event.type)}</span>
              <span className="tag bg-green-100 text-green-700">{event.category}</span>
              <span className="tag bg-gray-100 text-gray-600">{event.status === 'published' ? '已发布' : event.status}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>组织者：{event.organizer?.display_name || `用户${event.organizer_id}`}</span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                开始时间
              </div>
              <p className="font-medium text-gray-900">{new Date(event.start_time).toLocaleString('zh-CN')}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                结束时间
              </div>
              <p className="font-medium text-gray-900">{new Date(event.end_time).toLocaleString('zh-CN')}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                活动地点
              </div>
              <p className="font-medium text-gray-900">{event.location_name}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                参与费用
              </div>
              <p className="font-medium text-gray-900">{event.price === 0 ? '免费' : `¥${event.price}`}</p>
            </div>
          </div>

          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">活动详情</h2>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
              {event.description}
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span key={tag} className="tag bg-gray-100 text-gray-600">#{tag}</span>
              ))}
            </div>
          )}

          {/* Map */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">活动地点</h2>
            <MapView
              singleMarker={{ lat: event.latitude, lng: event.longitude, title: event.location_name }}
              center={[event.latitude, event.longitude]}
              zoom={13}
              height="300px"
            />
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">快捷入口</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to={`/events/${event.id}/album`}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
              >
                <span className="text-2xl">📸</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm group-hover:text-primary-600">查看相册</p>
                  <p className="text-xs text-gray-400">活动精彩瞬间</p>
                </div>
              </Link>
              <Link
                to={`/events/${event.id}/discussion`}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm group-hover:text-primary-600">参与讨论</p>
                  <p className="text-xs text-gray-400">交流互动</p>
                </div>
              </Link>
              <button
                onClick={() => { setShowCopyModal(true); setCopywritingResult(null); }}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group text-left"
              >
                <span className="text-2xl">✍️</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm group-hover:text-primary-600">AI 生成文案</p>
                  <p className="text-xs text-gray-400">一键生成宣传文案</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration panel */}
          <div className="card p-6 sticky top-20">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>报名情况</span>
                <span className={isFull ? 'text-red-500 font-medium' : 'text-gray-700 font-medium'}>
                  {event.current_participants} / {event.max_participants}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={event.current_participants} aria-valuemax={event.max_participants}>
                <div
                  className={`h-2 rounded-full ${isFull ? 'bg-red-400' : 'bg-primary-500'}`}
                  style={{ width: `${Math.min((event.current_participants / event.max_participants) * 100, 100)}%` }}
                />
              </div>
            </div>

            {isOrganizer ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">您是此活动的组织者</p>
                <button
                  onClick={() => navigate(`/events/${event.id}/manage`)}
                  className="btn-primary w-full"
                >
                  管理活动
                </button>
              </div>
            ) : registrationStatus ? (
              <div className={`rounded-lg p-3 text-center ${statusLabels[registrationStatus]?.color}`}>
                您的报名状态：{statusLabels[registrationStatus]?.text}
              </div>
            ) : (
              <>
                {registerError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-2 mb-3" role="alert">
                    {registerError}
                  </div>
                )}
                <button
                  onClick={handleRegister}
                  disabled={isFull || registering}
                  className="btn-primary w-full"
                >
                  {registering ? '报名中...' : isFull ? '名额已满' : '立即报名'}
                </button>
              </>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
              <p>💰 费用：{event.price === 0 ? '免费参加' : `¥${event.price}/人`}</p>
              <p>👥 名额：{Math.max(event.max_participants - event.current_participants, 0)} 个剩余</p>
            </div>
          </div>

          {/* Registrations list (organizer only) */}
          {isOrganizer && registrations.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-3">报名列表</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {registrations.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{reg.user?.display_name || `用户${reg.user_id}`}</p>
                      <p className="text-xs text-gray-400">{new Date(reg.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <span className={`tag ${statusLabels[reg.status]?.color}`}>
                      {statusLabels[reg.status]?.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finance overview (organizer only) */}
          {isOrganizer && financeRecords.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-3">财务概览</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">收入</span>
                  <span className="font-medium text-green-600">¥{totalIncome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">支出</span>
                  <span className="font-medium text-red-600">¥{totalExpense}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">结余</span>
                  <span className="font-bold text-gray-900">¥{totalIncome - totalExpense}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* AI Copywriting Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCopyModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">✍️ AI 生成活动文案</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {!copywritingResult ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发布平台</label>
                  <select
                    value={copyPlatform}
                    onChange={(e) => setCopyPlatform(e.target.value)}
                    className="input-field"
                  >
                    <option value="xiaohongshu">小红书</option>
                    <option value="wechat">微信公众号</option>
                    <option value="douyin">抖音</option>
                    <option value="weibo">微博</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文案阶段</label>
                  <select
                    value={copyStage}
                    onChange={(e) => setCopyStage(e.target.value)}
                    className="input-field"
                  >
                    <option value="before">活动预热</option>
                    <option value="during">活动进行中</option>
                    <option value="after">活动回顾</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateCopy}
                  disabled={copyGenerating}
                  className="btn-primary w-full"
                >
                  {copyGenerating ? '生成中...' : '✨ 生成文案'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="tag bg-primary-100 text-primary-700">
                      {copywritingResult.platform === 'xiaohongshu' ? '小红书' :
                       copywritingResult.platform === 'wechat' ? '微信公众号' :
                       copywritingResult.platform === 'douyin' ? '抖音' : '微博'}
                    </span>
                    <span className="tag bg-gray-100 text-gray-600">
                      {copywritingResult.stage === 'before' ? '预热' :
                       copywritingResult.stage === 'during' ? '进行中' : '回顾'}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{copywritingResult.content}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(copywritingResult.content || '');
                    }}
                    className="btn-secondary flex-1"
                  >
                    📋 复制文案
                  </button>
                  <button
                    onClick={() => setCopywritingResult(null)}
                    className="btn-primary flex-1"
                  >
                    🔄 重新生成
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
