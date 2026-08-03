import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getProfile,
  updateProfile,
  addInterest,
  removeInterest,
  uploadAvatar,
} from '../api/client';
import type { Profile as ProfileData, UpdateProfileRequest } from '../types';
import { getErrorMessage } from '../utils/errors';

const availableTags = [
  '户外', '音乐', '读书', '运动', '讲座', '科技',
  '美食', '艺术', '摄影', '旅行', '创业', '公益',
];

const genderLabels: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
  '': '未设置',
};

/** 从 AuthContext user 信息构建本地 fallback 画像 */
function buildFallbackProfile(userId: number, displayName: string, username: string, email: string, tags: string[], avatarUrl?: string): ProfileData {
  return {
    user_id: userId,
    username,
    display_name: displayName,
    email,
    avatar_url: avatarUrl,
    bio: '',
    gender: '',
    birthday: '',
    city: '',
    tags,
    stats: { organized_count: 0, participated_count: 0, avg_rating: 0 },
  };
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 兴趣标签输入
  const [newTag, setNewTag] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  // 头像上传
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 编辑表单
  const [editForm, setEditForm] = useState<UpdateProfileRequest>({
    display_name: '',
    bio: '',
    gender: '',
    birthday: '',
    city: '',
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProfile();
      setProfile(data);
      setEditForm({
        display_name: data.display_name,
        bio: data.bio,
        gender: data.gender,
        birthday: data.birthday,
        city: data.city,
      });
    } catch (err) {
      // 后端未启动 — 使用 AuthContext 信息构建 fallback
      if (user) {
        const fallback = buildFallbackProfile(
          user.id, user.display_name || '', user.username, user.email, user.tags, user.avatar_url,
        );
        setProfile(fallback);
        setEditForm({
          display_name: fallback.display_name,
          bio: '',
          gender: '',
          birthday: '',
          city: '',
        });
      } else {
        setError(getErrorMessage(err, '获取画像失败'));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ===== 编辑保存 =====
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await updateProfile(editForm);
      setProfile(data);
      // 同步 AuthContext
      if (user && editForm.display_name) {
        updateUser({ ...user, display_name: editForm.display_name });
      }
      setEditing(false);
      setSuccessMsg('保存成功');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      // fallback — 本地更新
      if (profile) {
        const updated: ProfileData = {
          ...profile,
          display_name: editForm.display_name || profile.display_name,
          bio: editForm.bio || '',
          gender: editForm.gender || '',
          birthday: editForm.birthday || '',
          city: editForm.city || '',
        };
        setProfile(updated);
        if (user && editForm.display_name) {
          updateUser({ ...user, display_name: editForm.display_name });
        }
      }
      setEditing(false);
      setSuccessMsg('已保存（离线模式）');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ===== 兴趣标签管理 =====
  const handleAddTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !profile || profile.tags.includes(trimmed) || tagSaving) return;
    setTagSaving(true);
    const prevTags = profile.tags;
    // 乐观更新
    setProfile({ ...profile, tags: [...prevTags, trimmed] });
    setNewTag('');
    try {
      const data = await addInterest(trimmed);
      setProfile(data);
    } catch {
      // 保留乐观更新结果
      if (user) {
        updateUser({ ...user, tags: [...prevTags, trimmed] });
      }
    } finally {
      setTagSaving(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!profile || tagSaving) return;
    setTagSaving(true);
    const prevTags = profile.tags;
    // 乐观更新
    setProfile({ ...profile, tags: prevTags.filter((t) => t !== tag) });
    try {
      const data = await removeInterest(tag);
      setProfile(data);
    } catch {
      if (user) {
        updateUser({ ...user, tags: prevTags.filter((t) => t !== tag) });
      }
    } finally {
      setTagSaving(false);
    }
  };

  // ===== 头像上传 =====
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // 客户端校验
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setAvatarUploading(true);
    setError('');
    try {
      const res = await uploadAvatar(file);
      setProfile({ ...profile, avatar_url: res.url });
      if (user) {
        updateUser({ ...user, avatar_url: res.url });
      }
      setSuccessMsg('头像更新成功');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      // fallback — 使用本地预览 URL
      const localUrl = URL.createObjectURL(file);
      setProfile({ ...profile, avatar_url: localUrl });
      if (user) {
        updateUser({ ...user, avatar_url: localUrl });
      }
      setSuccessMsg('头像已更新（离线模式）');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setAvatarUploading(false);
      // 清空 input 以便重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ===== 渲染 =====
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-gray-500 text-lg mb-4">{error || '无法加载画像信息'}</p>
        <button onClick={fetchProfile} className="btn-primary">重新加载</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 消息提示 */}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 flex items-center gap-2" role="status">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3" role="alert">
          {error}
        </div>
      )}

      {/* ===== 画像头部 ===== */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* 头像（可上传） */}
          <div className="relative group flex-shrink-0">
            <button
              onClick={handleAvatarClick}
              className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-100 hover:ring-primary-300 transition-all relative"
              aria-label="点击上传头像"
            >
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
              {/* 悬浮遮罩 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">📷 更换</span>
              </div>
            </button>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="选择头像文件"
            />
          </div>

          {/* 名字 + 统计 */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
              {user?.role === 'admin' && (
                <span className="tag bg-primary-100 text-primary-700">管理员</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">@{profile.username}</p>
            {profile.bio && !editing && (
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

          {/* 编辑按钮 */}
          <button
            onClick={() => {
              if (editing) {
                // 取消 → 恢复表单
                setEditForm({
                  display_name: profile.display_name,
                  bio: profile.bio,
                  gender: profile.gender,
                  birthday: profile.birthday,
                  city: profile.city,
                });
              }
              setEditing(!editing);
            }}
            className="btn-secondary text-sm flex-shrink-0"
          >
            {editing ? '✕ 取消' : '✏️ 编辑'}
          </button>
        </div>
      </div>

      {/* ===== 基本信息 ===== */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span> 基本信息
        </h2>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="edit-display-name" className="block text-sm font-medium text-gray-700 mb-1.5">昵称</label>
              <input
                id="edit-display-name"
                type="text"
                value={editForm.display_name || ''}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                className="input-field"
                placeholder="输入你的昵称"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-bio" className="block text-sm font-medium text-gray-700 mb-1.5">个人简介</label>
              <textarea
                id="edit-bio"
                value={editForm.bio || ''}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="input-field min-h-[80px] resize-y"
                placeholder="介绍一下自己..."
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{(editForm.bio || '').length}/200</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
                <select
                  id="edit-gender"
                  value={editForm.gender || ''}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as UpdateProfileRequest['gender'] })}
                  className="input-field"
                >
                  <option value="">未设置</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-birthday" className="block text-sm font-medium text-gray-700 mb-1.5">生日</label>
                <input
                  id="edit-birthday"
                  type="date"
                  value={editForm.birthday || ''}
                  onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="edit-city" className="block text-sm font-medium text-gray-700 mb-1.5">城市</label>
                <input
                  id="edit-city"
                  type="text"
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="input-field"
                  placeholder="如：北京"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '保存中...' : '💾 保存修改'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditForm({
                    display_name: profile.display_name,
                    bio: profile.bio,
                    gender: profile.gender,
                    birthday: profile.birthday,
                    city: profile.city,
                  });
                  setEditing(false);
                }}
                className="btn-secondary"
              >
                取消
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="昵称" value={profile.display_name} />
            <InfoRow label="性别" value={genderLabels[profile.gender] || '未设置'} />
            <InfoRow label="生日" value={profile.birthday || '未设置'} />
            <InfoRow label="城市" value={profile.city || '未设置'} />
            <div className="sm:col-span-2">
              <p className="text-sm text-gray-500">个人简介</p>
              <p className="font-medium text-gray-900 mt-1 whitespace-pre-wrap">
                {profile.bio || '这个人很懒，什么都没留下'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== 兴趣标签 ===== */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🏷️</span> 兴趣标签
        </h2>

        {/* 已有标签 */}
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="已选兴趣标签">
          {profile.tags.length > 0 ? (
            profile.tags.map((tag) => (
              <span
                key={tag}
                className="tag bg-primary-50 text-primary-700 px-3 py-1.5 flex items-center gap-1.5"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-primary-400 hover:text-primary-600 transition-colors"
                  aria-label={`移除标签 ${tag}`}
                  disabled={tagSaving}
                >
                  ✕
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-400">还没有添加标签，选择你感兴趣的吧 👇</p>
          )}
        </div>

        {/* 推荐标签选择 */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 mb-2">推荐标签</p>
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="推荐兴趣标签">
            {availableTags.map((tag) => {
              const selected = profile.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => (selected ? handleRemoveTag(tag) : handleAddTag(tag))}
                  disabled={tagSaving}
                  aria-pressed={selected}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
                    selected
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {selected && '✓ '}{tag}
                </button>
              );
            })}
          </div>

          {/* 自定义标签输入 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(newTag);
                }
              }}
              className="input-field flex-1"
              placeholder="输入自定义标签后按回车添加"
              maxLength={20}
            />
            <button
              onClick={() => handleAddTag(newTag)}
              disabled={!newTag.trim() || tagSaving}
              className="btn-primary px-6"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      {/* ===== 快捷入口 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-2xl">📅</div>
          <div>
            <h3 className="font-medium text-gray-900">我的活动</h3>
            <p className="text-sm text-gray-400">查看组织和参与的活动</p>
          </div>
        </Link>
        <Link to="/events/create" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-2xl">➕</div>
          <div>
            <h3 className="font-medium text-gray-900">创建活动</h3>
            <p className="text-sm text-gray-400">发起一场新的活动</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

/** 信息行组件 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}
