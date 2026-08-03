import { useState, useEffect } from 'react';
import type { Achievement, PointsSummary } from '../types';
import { getAchievements, getPointsSummary, getLeaderboard } from '../api/client';

// ===== 模拟数据 =====
const mockAchievements: Achievement[] = [
  { id: 1, name: '初次参与', description: '第一次参加活动', icon: '🌟', condition_type: 'participate_count', condition_value: 1, is_limited: false },
  { id: 2, name: '活跃达人', description: '累计参加10次活动', icon: '🔥', condition_type: 'participate_count', condition_value: 10, is_limited: false },
  { id: 3, name: '组织先锋', description: '成功组织5场活动', icon: '👑', condition_type: 'organize_count', condition_value: 5, is_limited: false },
  { id: 4, name: '社交蝴蝶', description: '添加20个好友', icon: '🦋', condition_type: 'friend_count', condition_value: 20, is_limited: false },
  { id: 5, name: '好评如潮', description: '获得50个好评', icon: '💎', condition_type: 'rating_count', condition_value: 50, is_limited: false },
  { id: 6, name: '摄影大师', description: '上传100张照片', icon: '📸', condition_type: 'photo_count', condition_value: 100, is_limited: false },
  { id: 7, name: '评论达人', description: '发表200条评论', icon: '💬', condition_type: 'comment_count', condition_value: 200, is_limited: false },
  { id: 8, name: '限定·创世人', description: '平台首批100名用户', icon: '🏆', condition_type: 'early_adopter', condition_value: 1, is_limited: true },
];

const mockPointsSummary: PointsSummary = {
  total_points: 1280,
  level: 5,
  achievements: [
    { id: 1, user_id: 1, achievement_id: 1, earned_at: '2026-06-15T10:00:00', achievement: mockAchievements[0] },
    { id: 2, user_id: 1, achievement_id: 2, earned_at: '2026-07-20T14:30:00', achievement: mockAchievements[1] },
    { id: 3, user_id: 1, achievement_id: 3, earned_at: '2026-08-01T09:00:00', achievement: mockAchievements[2] },
  ],
  recent_transactions: [
    { id: 1, user_id: 1, points: 50, tx_type: 'earn', description: '参加活动：周末香山徒步', related_event_id: 1, created_at: '2026-08-10T16:00:00' },
    { id: 2, user_id: 1, points: 20, tx_type: 'earn', description: '上传照片奖励', related_event_id: 1, created_at: '2026-08-10T15:00:00' },
    { id: 3, user_id: 1, points: -30, tx_type: 'spend', description: '兑换优惠券', related_event_id: null, created_at: '2026-08-08T12:00:00' },
    { id: 4, user_id: 1, points: 100, tx_type: 'earn', description: '组织活动奖励', related_event_id: 2, created_at: '2026-08-05T18:00:00' },
  ],
};

const mockLeaderboard = [
  { user_id: 3, username: 'climber', display_name: '攀岩达人', total_points: 2450, rank: 1 },
  { user_id: 5, username: 'event_master', display_name: '活动达人', total_points: 2100, rank: 2 },
  { user_id: 1, username: 'hiker01', display_name: '山间行者', total_points: 1280, rank: 3 },
  { user_id: 11, username: 'nature_lover', display_name: '自然之友', total_points: 980, rank: 4 },
  { user_id: 12, username: 'photo_fan', display_name: '摄影爱好者', total_points: 750, rank: 5 },
];

export default function AchievementPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pointsSummary, setPointsSummary] = useState<PointsSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<typeof mockLeaderboard>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'achievements' | 'leaderboard'>('achievements');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [achRes, ptsRes, lbRes] = await Promise.allSettled([
          getAchievements(),
          getPointsSummary(),
          getLeaderboard(),
        ]);
        setAchievements(achRes.status === 'fulfilled' ? achRes.value : mockAchievements);
        setPointsSummary(ptsRes.status === 'fulfilled' ? ptsRes.value : mockPointsSummary);
        setLeaderboard(lbRes.status === 'fulfilled' ? lbRes.value : mockLeaderboard);
      } catch {
        setAchievements(mockAchievements);
        setPointsSummary(mockPointsSummary);
        setLeaderboard(mockLeaderboard);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const earnedIds = new Set(pointsSummary?.achievements.map((a) => a.achievement_id) || []);

  // Level progress
  const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000];
  const currentLevel = pointsSummary?.level || 1;
  const currentPoints = pointsSummary?.total_points || 0;
  const nextThreshold = levelThresholds[currentLevel] || 9999;
  const prevThreshold = levelThresholds[currentLevel - 1] || 0;
  const progressPercent = Math.min(((currentPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏆 成就中心</h1>
        <p className="text-gray-500 text-sm mt-1">解锁成就，积累积分，展示你的活跃度</p>
      </div>

      {/* Points Overview Card */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">当前积分</p>
            <p className="text-3xl font-bold">{currentPoints}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">等级</p>
            <p className="text-3xl font-bold">Lv.{currentLevel}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/70">等级进度</span>
            <span className="text-white/90">{currentPoints} / {nextThreshold}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div
              className="bg-white rounded-full h-2.5 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
          <span>🏅 已解锁 {earnedIds.size} / {achievements.length} 成就</span>
          <span>📊 排名第 {leaderboard.find((l) => l.user_id === 1)?.rank || '-'} 名</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'achievements'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏅 全部成就
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'leaderboard'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 积分排行
        </button>
      </div>

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <>
          {achievements.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🏅</div>
              <p className="text-gray-500">暂无成就数据</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map((ach) => {
                const isEarned = earnedIds.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`card p-5 text-center transition-all ${
                      isEarned
                        ? 'ring-2 ring-primary-200 bg-primary-50/30'
                        : 'opacity-60 grayscale'
                    }`}
                  >
                    <div className="text-4xl mb-3">{ach.icon}</div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{ach.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{ach.description}</p>
                    {isEarned ? (
                      <span className="tag bg-primary-100 text-primary-700">✅ 已解锁</span>
                    ) : ach.is_limited ? (
                      <span className="tag bg-amber-100 text-amber-700">🔒 限定</span>
                    ) : (
                      <span className="tag bg-gray-100 text-gray-500">🔒 未解锁</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Transactions */}
          {pointsSummary?.recent_transactions && pointsSummary.recent_transactions.length > 0 && (
            <div className="card p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">📋 最近积分变动</h3>
              <div className="space-y-3">
                {pointsSummary.recent_transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('zh-CN')}</p>
                    </div>
                    <span className={`font-semibold text-sm ml-4 ${tx.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <>
          {leaderboard.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-gray-500">暂无排行数据</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">积分</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={`hover:bg-gray-50 transition-colors ${entry.rank <= 3 ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                          entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                          entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {entry.display_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{entry.display_name}</p>
                            <p className="text-xs text-gray-400">@{entry.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-primary-600">{entry.total_points.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
