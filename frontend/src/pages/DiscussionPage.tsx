import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Discussion } from '../types';
import { getDiscussions, createDiscussion } from '../api/client';

// ===== 模拟数据 =====
const mockDiscussions: Discussion[] = [
  {
    id: 1, event_id: 1, user_id: 1, content: '📢 各位参与者请注意：活动当天早上8点在香山公园东门集合，请准时到达！带好身份证和水壶。',
    parent_id: null, is_announcement: true, created_at: '2026-08-08T09:00:00', updated_at: '2026-08-08T09:00:00',
    user_display_name: '山间行者',
  },
  {
    id: 2, event_id: 1, user_id: 10, content: '请问需要带登山杖吗？第一次参加这种活动，有点紧张。',
    parent_id: null, is_announcement: false, created_at: '2026-08-08T14:00:00', updated_at: '2026-08-08T14:00:00',
    user_display_name: '山间行者',
  },
  {
    id: 3, event_id: 1, user_id: 1, content: '登山杖可选带，山路有些台阶比较陡。建议穿防滑运动鞋！',
    parent_id: 2, is_announcement: false, created_at: '2026-08-08T15:30:00', updated_at: '2026-08-08T15:30:00',
    user_display_name: '山间行者',
  },
  {
    id: 4, event_id: 1, user_id: 11, content: '太期待了！请问活动结束后有聚餐安排吗？',
    parent_id: null, is_announcement: false, created_at: '2026-08-09T10:00:00', updated_at: '2026-08-09T10:00:00',
    user_display_name: '自然之友',
  },
  {
    id: 5, event_id: 1, user_id: 12, content: '上次参加类似的徒步活动，风景超棒！大家记得带充电宝拍照📱',
    parent_id: null, is_announcement: false, created_at: '2026-08-09T16:00:00', updated_at: '2026-08-09T16:00:00',
    user_display_name: '攀岩达人',
  },
];

export default function DiscussionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const eventId = Number(id);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDiscussions(eventId);
      setDiscussions(data.items);
    } catch {
      setDiscussions(mockDiscussions);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  const handleSubmit = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      await createDiscussion(eventId, newContent.trim(), replyTo || undefined);
      setNewContent('');
      setReplyTo(null);
      await fetchDiscussions();
    } catch {
      // Mock: add locally
      const newDiscussion: Discussion = {
        id: Date.now(),
        event_id: eventId,
        user_id: user?.id || 1,
        content: newContent.trim(),
        parent_id: replyTo,
        is_announcement: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_display_name: user?.display_name || user?.username || '我',
      };
      setDiscussions((prev) => [...prev, newDiscussion]);
      setNewContent('');
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Separate announcements and regular discussions
  const announcements = discussions.filter((d) => d.is_announcement && !d.parent_id);
  const topLevelDiscussions = discussions.filter((d) => !d.parent_id && !d.is_announcement);
  const getReplies = (parentId: number) => discussions.filter((d) => d.parent_id === parentId);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500" aria-label="面包屑导航">
        <Link to="/" className="hover:text-primary-600">首页</Link>
        <span className="mx-2">/</span>
        <Link to={`/events/${id}`} className="hover:text-primary-600">活动详情</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">讨论区</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💬 活动讨论区</h1>
        <p className="text-gray-500 text-sm mt-1">共 {discussions.length} 条讨论</p>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="mb-6 space-y-3">
          {announcements.map((item) => (
            <div key={item.id} className="card p-4 border-l-4 border-l-amber-400 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="tag bg-amber-100 text-amber-700">📢 公告</span>
                <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-gray-700">{item.content}</p>
              <p className="text-xs text-gray-400 mt-2">— {item.user_display_name || `用户${item.user_id}`}</p>
            </div>
          ))}
        </div>
      )}

      {/* Discussion List */}
      {topLevelDiscussions.length === 0 && announcements.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-gray-500 text-lg mb-2">还没有讨论</p>
          <p className="text-gray-400 text-sm">发起第一条讨论，和大家聊聊吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelDiscussions.map((item) => {
            const replies = getReplies(item.id);
            return (
              <div key={item.id} className="card p-5">
                {/* Main post */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary-700">
                      {(item.user_display_name || '?').charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{item.user_display_name || `用户${item.user_id}`}</span>
                      <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{item.content}</p>
                    <button
                      onClick={() => setReplyTo(replyTo === item.id ? null : item.id)}
                      className="text-xs text-gray-400 hover:text-primary-500 mt-2 transition-colors"
                    >
                      💬 回复
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-12 mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-600">
                            {(reply.user_display_name || '?').charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 text-xs">{reply.user_display_name || `用户${reply.user_id}`}</span>
                            <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleString('zh-CN')}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input inline */}
                {replyTo === item.id && (
                  <div className="ml-12 mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="回复..."
                      className="input-field text-sm flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      value={replyTo === item.id ? newContent : ''}
                      onChange={(e) => setNewContent(e.target.value)}
                    />
                    <button onClick={handleSubmit} disabled={submitting || !newContent.trim()} className="btn-primary text-sm px-3">
                      发送
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New discussion input */}
      <div className="card p-5 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary-700">
              {(user?.display_name || user?.username || '?').charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <textarea
              placeholder="说点什么..."
              className="input-field text-sm resize-none"
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              {replyTo && (
                <span className="text-xs text-gray-400">
                  回复 #{replyTo}
                  <button onClick={() => { setReplyTo(null); setNewContent(''); }} className="ml-2 text-red-400 hover:text-red-500">取消</button>
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !newContent.trim()}
                className="btn-primary text-sm ml-auto"
              >
                {submitting ? '发送中...' : '发布讨论'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
