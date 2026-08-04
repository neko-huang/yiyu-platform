import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyEvents, getMyRegistrations } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Event, MyRegistration } from '../types';

type Tab = 'created' | 'registered';

export default function MyEventsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('created');

  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [createdLoading, setCreatedLoading] = useState(false);
  const [createdError, setCreatedError] = useState('');

  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const loadCreated = useCallback(async () => {
    setCreatedLoading(true);
    setCreatedError('');
    try {
      const data = await getMyEvents();
      // 确保只显示当前用户创建的活动
      const filtered = (data.items || []).filter(
        (e) => e.organizer_id === user?.id
      );
      setCreatedEvents(filtered);
    } catch {
      setCreatedError('加载我创建的活动失败');
    } finally {
      setCreatedLoading(false);
    }
  }, []);

  const loadRegistered = useCallback(async () => {
    setRegLoading(true);
    setRegError('');
    try {
      const data = await getMyRegistrations();
      setRegistrations(data.items || []);
    } catch {
      setRegError('加载我报名的活动失败');
    } finally {
      setRegLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'created') loadCreated();
    else loadRegistered();
  }, [tab, loadCreated, loadRegistered]);

  const statusLabel: Record<string, string> = {
    draft: '草稿',
    pending: '审核中',
    published: '已发布',
    ongoing: '进行中',
    finished: '已结束',
    archived: '已归档',
  };

  const regStatusLabel: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    checked_in: '已签到',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👤 我的活动</h1>
        <p className="text-gray-500">管理你创建和参加的活动</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('created')}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
            tab === 'created' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 我创建的
        </button>
        <button
          onClick={() => setTab('registered')}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
            tab === 'registered' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 我报名的
        </button>
      </div>

      {/* 我创建的活动 */}
      {tab === 'created' && (
        <div>
          {createdLoading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : createdError ? (
            <div className="text-center py-12 text-red-500">{createdError}</div>
          ) : createdEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg">还没有创建过活动</p>
              <Link
                to="/events/create"
                className="inline-block mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                创建活动
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {createdEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="card p-4 block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {event.cover_image && (
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          event.status === 'published' ? 'bg-green-100 text-green-700' :
                          event.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                          event.status === 'finished' ? 'bg-gray-100 text-gray-600' :
                          event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {statusLabel[event.status] || event.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{event.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {event.category && <span>🏷️ {event.category}</span>}
                        {event.location_name && <span>📍 {event.location_name}</span>}
                        {event.start_time && <span>🕐 {new Date(event.start_time).toLocaleDateString('zh-CN')}</span>}
                        <span>👥 {event.current_participants}/{event.max_participants || '∞'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 我报名的活动 */}
      {tab === 'registered' && (
        <div>
          {regLoading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : regError ? (
            <div className="text-center py-12 text-red-500">{regError}</div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-5xl mb-4">📝</p>
              <p className="text-lg">还没有报名任何活动</p>
              <Link
                to="/"
                className="inline-block mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                浏览活动
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map((reg) => (
                <Link
                  key={reg.id}
                  to={`/events/${reg.event_id}`}
                  className="card p-4 block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {reg.event.cover_image && (
                      <img
                        src={reg.event.cover_image}
                        alt={reg.event.title}
                        className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{reg.event.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                          reg.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                          reg.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {regStatusLabel[reg.status] || reg.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{reg.event.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {reg.event.category && <span>🏷️ {reg.event.category}</span>}
                        {reg.event.location_name && <span>📍 {reg.event.location_name}</span>}
                        {reg.event.start_time && <span>🕐 {new Date(reg.event.start_time).toLocaleDateString('zh-CN')}</span>}
                        <span>👥 {reg.event.current_participants}/{reg.event.max_participants || '∞'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}