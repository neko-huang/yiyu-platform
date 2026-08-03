import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import type { PublicProfile } from '../types';

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const targetUserId = Number(userId);

  const fetchProfile = useCallback(async () => {
    if (!targetUserId || isNaN(targetUserId)) {
      setError('无效的用户 ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getUserProfile(targetUserId);
      setProfile(data);
    } catch (err) {
      // 后端未启动 — 构造 fallback
      setError(getErrorMessage(err, '获取用户信息失败'));
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-gray-500 text-lg mb-4">{error || '用户不存在'}</p>
        <Link to="/" className="btn-primary inline-flex">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 面包屑 */}
      <nav className="mb-4 text-sm text-gray-500" aria-label="面包屑导航">
        <Link to="/" className="hover:text-primary-600">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">用户主页</span>
      </nav>

      {/* ===== 画像头部 ===== */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* 头像 */}
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-100 flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* 名字 + 统计 */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
            <p className="text-sm text-gray-500 mt-1">@{profile.username}</p>
            {profile.bio && (
              <p className="text-gray-600 text-sm mt-2 max-w-md">{profile.bio}</p>
            )}

            {/* 统计数据 */}
            <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{profile.stats.organized_count}</p>
                <p className="text-xs text-gray-400">发布活动</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{profile.stats.participated_count}</p>
                <p className="text-xs text-gray-400">参与活动</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">
                  {profile.stats.avg_rating > 0 ? profile.stats.avg_rating.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-gray-400">平均评分</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 兴趣标签 ===== */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🏷️</span> 兴趣标签
        </h2>
        {profile.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.tags.map((tag) => (
              <span key={tag} className="tag bg-primary-50 text-primary-700 px-3 py-1.5">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">该用户还没有添加兴趣标签</p>
        )}
      </div>

      {/* ===== 个人简介 ===== */}
      {profile.bio && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📝</span> 个人简介
          </h2>
          <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* 返回按钮 */}
      <div className="text-center">
        <Link to="/" className="btn-secondary">← 返回首页</Link>
      </div>
    </div>
  );
}
