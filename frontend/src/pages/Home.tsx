import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard';
import client from '../api/client';
import type { Event } from '../types';
import { categories } from '../utils/constants';

// 模拟数据 - 后端未启动时使用
const mockEvents: Event[] = [
  {
    id: 1,
    title: '周末香山徒步登山活动',
    description: '金秋时节，香山红叶正盛。我们组织一次轻松的徒步登山活动，适合各年龄段参与。沿途欣赏红叶，登顶后俯瞰北京全城美景。',
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
  {
    id: 2,
    title: '城市民谣音乐之夜',
    description: '在城市的一角，聆听民谣歌手的深情演绎。一杯咖啡，一段旋律，让心灵在音乐中放松。',
    organizer_id: 2,
    type: 'offline',
    category: '音乐',
    start_time: '2026-08-15T19:30:00',
    end_time: '2026-08-15T22:00:00',
    location_name: '上海·思南公馆',
    latitude: 31.2226,
    longitude: 121.4737,
    max_participants: 100,
    current_participants: 67,
    price: 88,
    status: 'published',
    tags: ['民谣', '现场', '文艺'],
  },
  {
    id: 3,
    title: '《人类简史》读书分享会',
    description: '一起探讨尤瓦尔·赫拉利的经典之作，从认知革命到科技革命，重新审视人类文明的发展脉络。',
    organizer_id: 3,
    type: 'hybrid',
    category: '读书',
    start_time: '2026-08-12T14:00:00',
    end_time: '2026-08-12T17:00:00',
    location_name: '杭州·钟书阁',
    latitude: 30.2741,
    longitude: 120.1551,
    max_participants: 30,
    current_participants: 30,
    price: 0,
    status: 'published',
    tags: ['读书', '分享', '历史'],
  },
  {
    id: 4,
    title: '城市马拉松挑战赛',
    description: '21公里半程马拉松，穿越城市最美赛道。专业补给站、医疗团队全程保障，完赛奖牌等你来拿！',
    organizer_id: 4,
    type: 'offline',
    category: '运动',
    start_time: '2026-08-20T07:00:00',
    end_time: '2026-08-20T12:00:00',
    location_name: '成都·锦城湖公园',
    latitude: 30.5728,
    longitude: 104.0668,
    max_participants: 500,
    current_participants: 287,
    price: 120,
    status: 'published',
    tags: ['马拉松', '跑步', '挑战'],
  },
  {
    id: 5,
    title: 'AI与大模型技术前沿讲座',
    description: '邀请知名AI研究员分享最新大语言模型技术进展，涵盖GPT、Claude、DeepSeek等前沿模型的原理与应用。',
    organizer_id: 5,
    type: 'online',
    category: '讲座',
    start_time: '2026-08-08T19:00:00',
    end_time: '2026-08-08T21:00:00',
    location_name: '线上·腾讯会议',
    latitude: 39.9042,
    longitude: 116.4074,
    max_participants: 200,
    current_participants: 156,
    price: 0,
    status: 'published',
    tags: ['AI', '大模型', '技术'],
  },
  {
    id: 6,
    title: '夏日户外烧烤派对',
    description: '在山间营地享受美味的户外烧烤，配备专业烤具和食材。白天烧烤游戏，晚上篝火晚会，畅享夏日时光。',
    organizer_id: 6,
    type: 'offline',
    category: '美食',
    start_time: '2026-08-18T11:00:00',
    end_time: '2026-08-18T20:00:00',
    location_name: '北京·怀柔山吧',
    latitude: 40.3156,
    longitude: 116.6312,
    max_participants: 40,
    current_participants: 18,
    price: 158,
    status: 'published',
    tags: ['烧烤', '派对', '户外'],
  },
];

const PAGE_SIZE = 9;

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingMockData, setUsingMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/events', {
        params: {
          search: searchQuery || undefined,
          category: selectedCategory !== '全部' ? selectedCategory : undefined,
        },
      });
      setEvents(res.data);
      setUsingMockData(false);
    } catch {
      // 后端未启动，使用模拟数据
      setUsingMockData(true);
      let filtered = [...mockEvents];
      if (selectedCategory !== '全部') {
        filtered = filtered.filter((e) => e.category === selectedCategory);
      }
      if (searchQuery) {
        filtered = filtered.filter(
          (e) =>
            e.title.includes(searchQuery) ||
            e.description.includes(searchQuery) ||
            e.tags.some((t) => t.includes(searchQuery)),
        );
      }
      setEvents(filtered);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchEvents();
    // 切换筛选条件时重置分页
    setVisibleCount(PAGE_SIZE);
  }, [fetchEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  // 当前可见的活动列表
  const visibleEvents = useMemo(
    () => events.slice(0, visibleCount),
    [events, visibleCount],
  );
  const hasMore = events.length > visibleCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">发现精彩活动</h1>
        <p className="text-gray-500">探索身边的活动，遇见志同道合的朋友</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
              placeholder="搜索活动名称、标签..."
              aria-label="搜索活动"
            />
          </div>
          <button type="submit" className="btn-primary px-8">
            搜索
          </button>
        </div>
      </form>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="活动分类筛选">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            aria-pressed={selectedCategory === cat}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchEvents} className="btn-secondary">
            重新加载
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500 text-lg mb-4">没有找到匹配的活动</p>
          <Link to="/events/create" className="btn-primary inline-flex">
            创建第一个活动
          </Link>
        </div>
      ) : (
        <>
          {usingMockData && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3">
              ⚠️ 后端服务未连接，当前显示模拟数据。启动后端后即可看到真实数据。
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              共找到 <span className="font-medium text-gray-700">{events.length}</span> 个活动
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {/* 加载更多 / 分页 */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="btn-secondary"
              >
                加载更多（剩余 {events.length - visibleCount} 个）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
