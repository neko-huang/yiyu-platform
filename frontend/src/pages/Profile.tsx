import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import type { Event } from '../types';

type Tab = 'info' | 'events' | 'tags';

const availableTags = ['户外', '音乐', '读书', '运动', '讲座', '科技', '美食', '艺术', '摄影', '旅行', '创业', '公益'];

const mockOrganizedEvents: Event[] = [
  { id: 1, title: '周末香山徒步登山活动', description: '', organizer_id: 1, type: 'offline', category: '户外', start_time: '2026-08-10T08:00:00', end_time: '2026-08-10T16:00:00', location_name: '北京', latitude: 39.9, longitude: 116.4, max_participants: 50, current_participants: 32, price: 50, status: 'published', tags: [] },
  { id: 5, title: '夏日烧烤派对（草稿）', description: '', organizer_id: 1, type: 'offline', category: '美食', start_time: '2026-08-25T11:00:00', end_time: '2026-08-25T20:00:00', location_name: '北京', latitude: 40.3, longitude: 116.6, max_participants: 40, current_participants: 0, price: 158, status: 'draft', tags: [] },
];

const mockJoinedEvents: Event[] = [
  { id: 2, title: '城市民谣音乐之夜', description: '', organizer_id: 2, type: 'offline', category: '音乐', start_time: '2026-08-15T19:30:00', end_time: '2026-08-15T22:00:00', location_name: '上海', latitude: 31.2, longitude: 121.5, max_participants: 100, current_participants: 67, price: 88, status: 'published', tags: [] },
  { id: 3, title: '《人类简史》读书分享会', description: '', organizer_id: 3, type: 'hybrid', category: '读书', start_time: '2026-08-12T14:00:00', end_time: '2026-08-12T17:00:00', location_name: '杭州', latitude: 30.3, longitude: 120.2, max_participants: 30, current_participants: 30, price: 0, status: 'published', tags: [] },
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [organizedEvents, setOrganizedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    display_name: user?.display_name || '',
    email: user?.email || '',
    tags: user?.tags || [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, joinedRes] = await Promise.all([
        client.get('/events', { params: { organizer_id: user?.id } }),
        client.get('/users/me/registrations'),
      ]);
      setOrganizedEvents(orgRes.data);
      // joinedRes may return registrations, extract events
      const joined = Array.isArray(joinedRes.data)
        ? joinedRes.data.map((r: { event?: Event; event_id: number }) => r.event).filter(Boolean)
        : [];
      setJoinedEvents(joined);
    } catch {
      setOrganizedEvents(mockOrganizedEvents);
      setJoinedEvents(mockJoinedEvents);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setEditForm({
        display_name: user.display_name,
        email: user.email,
        tags: user.tags,
      });
      fetchData();
    }
  }, [user, fetchData]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await client.put('/users/me', editForm);
      updateUser(res.data);
      setEditing(false);
    } catch {
      // 模拟更新
      if (user) {
        updateUser({ ...user, ...editForm });
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  if (!user) return null;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'info', label: '个人信息', icon: '👤' },
    { key: 'events', label: '我的活动', icon: '📅' },
    { key: 'tags', label: '兴趣标签', icon: '🏷️' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{user.display_name}</h1>
              {user.role === 'admin' && (
                <span className="tag bg-primary-100 text-primary-700">管理员</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">@{user.username} · {user.email}</p>
            {user.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.tags.map((tag) => (
                  <span key={tag} className="tag bg-gray-100 text-gray-600">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="btn-secondary text-sm"
          >
            {editing ? '取消' : '编辑'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="card p-6">
          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">显示名称</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
                <input
                  type="text"
                  value={user.username}
                  className="input-field bg-gray-50"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">用户名创建后不可修改</p>
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '保存中...' : '保存修改'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">显示名称</p>
                  <p className="font-medium text-gray-900 mt-1">{user.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">用户名</p>
                  <p className="font-medium text-gray-900 mt-1">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">邮箱</p>
                  <p className="font-medium text-gray-900 mt-1">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">角色</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Organized events */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">我组织的活动 ({organizedEvents.length})</h2>
            {loading ? (
              <div className="card p-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded" />
              </div>
            ) : organizedEvents.length > 0 ? (
              <div className="space-y-2">
                {organizedEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}/manage`}
                    className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(event.start_time).toLocaleDateString('zh-CN')} · {event.location_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {event.current_participants}/{event.max_participants}人
                      </span>
                      <span className={`tag ${
                        event.status === 'published' ? 'bg-green-100 text-green-700' :
                        event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {event.status === 'published' ? '已发布' : event.status === 'draft' ? '草稿' : '已结束'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center text-gray-400">
                <p>还没有组织过活动</p>
                <Link to="/events/create" className="btn-primary mt-3 inline-flex">创建活动</Link>
              </div>
            )}
          </div>

          {/* Joined events */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">我参加的活动 ({joinedEvents.length})</h2>
            {loading ? (
              <div className="card p-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded" />
              </div>
            ) : joinedEvents.length > 0 ? (
              <div className="space-y-2">
                {joinedEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(event.start_time).toLocaleDateString('zh-CN')} · {event.location_name}
                      </p>
                    </div>
                    <span className="tag bg-primary-100 text-primary-700">
                      {event.category}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center text-gray-400">
                <p>还没有参加任何活动</p>
                <Link to="/" className="btn-primary mt-3 inline-flex">去发现活动</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-2">管理兴趣标签</h2>
          <p className="text-sm text-gray-500 mb-4">选择你感兴趣的标签，我们会为你推荐相关活动</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {availableTags.map((tag) => {
              const selected = editForm.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selected
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {selected && '✓ '}{tag}
                </button>
              );
            })}
          </div>

          {/* Custom tag input */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500 mb-2">当前标签 ({editForm.tags.length})</p>
            <div className="flex flex-wrap gap-2">
              {editForm.tags.map((tag) => (
                <span key={tag} className="tag bg-primary-50 text-primary-700 flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    className="text-primary-400 hover:text-primary-600"
                  >
                    ×
                  </button>
                </span>
              ))}
              {editForm.tags.length === 0 && (
                <span className="text-sm text-gray-400">还没有选择标签</span>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await client.put('/users/me', { tags: editForm.tags });
                  updateUser(res.data);
                } catch {
                  if (user) updateUser({ ...user, tags: editForm.tags });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? '保存中...' : '保存标签'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
