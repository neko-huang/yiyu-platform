import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { searchEvents } from '../api/client';
import { categories } from '../utils/constants';
import { getErrorMessage } from '../utils/errors';
import type { Event, SearchParams } from '../types';

const PAGE_SIZE = 9;

/** 模拟搜索结果（后端未启动时） */
const mockSearchResults: Event[] = [
  {
    id: 1, title: '周末香山徒步登山活动', description: '金秋时节，香山红叶正盛。',
    organizer_id: 1, type: 'offline', category: '户外',
    start_time: '2026-08-10T08:00:00', end_time: '2026-08-10T16:00:00',
    location_name: '北京香山公园', latitude: 39.99, longitude: 116.19,
    max_participants: 50, current_participants: 32, price: 50, status: 'published',
    tags: ['徒步', '登山'],
  },
  {
    id: 2, title: '城市民谣音乐之夜', description: '聆听民谣歌手的深情演绎。',
    organizer_id: 2, type: 'offline', category: '音乐',
    start_time: '2026-08-15T19:30:00', end_time: '2026-08-15T22:00:00',
    location_name: '上海·思南公馆', latitude: 31.22, longitude: 121.47,
    max_participants: 100, current_participants: 67, price: 88, status: 'published',
    tags: ['民谣', '现场'],
  },
  {
    id: 4, title: '城市马拉松挑战赛', description: '21公里半程马拉松，穿越城市最美赛道。',
    organizer_id: 4, type: 'offline', category: '运动',
    start_time: '2026-08-20T07:00:00', end_time: '2026-08-20T12:00:00',
    location_name: '成都·锦城湖公园', latitude: 30.57, longitude: 104.07,
    max_participants: 500, current_participants: 287, price: 120, status: 'published',
    tags: ['马拉松', '跑步'],
  },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL 初始化筛选条件
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>(
    (searchParams.get('sort') as 'latest' | 'popular') || 'latest',
  );

  const [results, setResults] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingMock, setUsingMock] = useState(false);

  // 防抖
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (params: SearchParams, append = false) => {
      setLoading(true);
      setError('');
      try {
        const data = await searchEvents(params);
        setResults(append ? (prev) => [...prev, ...data.items] : data.items);
        setTotal(data.total);
        setUsingMock(false);
      } catch (err) {
        // fallback — 本地模拟
        setUsingMock(true);
        let filtered = [...mockSearchResults];
        if (params.q) {
          filtered = filtered.filter(
            (e) =>
              e.title.includes(params.q!) ||
              e.description.includes(params.q!) ||
              e.tags.some((t) => t.includes(params.q!)),
          );
        }
        if (params.category) {
          filtered = filtered.filter((e) => e.category === params.category);
        }
        if (params.city) {
          filtered = filtered.filter((e) => e.location_name.includes(params.city!));
        }
        if (params.sort === 'popular') {
          filtered.sort((a, b) => b.current_participants - a.current_participants);
        } else {
          filtered.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        }
        setResults(append ? (prev) => [...prev, ...filtered] : filtered);
        setTotal(filtered.length);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** 执行搜索（重置到第 1 页） */
  const performSearch = useCallback(() => {
    const pageNum = 1;
    setPage(pageNum);
    const params: SearchParams = {
      q: query || undefined,
      category: category || undefined,
      city: city || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sort: sortBy,
      page: pageNum,
      page_size: PAGE_SIZE,
    };
    // 同步 URL
    const urlParams: Record<string, string> = {};
    if (query) urlParams.q = query;
    if (category) urlParams.category = category;
    if (city) urlParams.city = city;
    if (startDate) urlParams.start_date = startDate;
    if (endDate) urlParams.end_date = endDate;
    urlParams.sort = sortBy;
    setSearchParams(urlParams, { replace: true });

    doSearch(params, false);
  }, [query, category, city, startDate, endDate, sortBy, doSearch, setSearchParams]);

  // 首次加载
  useEffect(() => {
    performSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜索词变化时防抖搜索
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch();
    }, 500);
  };

  const handleFilterChange = () => {
    // 筛选条件变化时立即搜索
    setTimeout(() => performSearch(), 0);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch();
  };

  /** 加载更多 */
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const params: SearchParams = {
      q: query || undefined,
      category: category || undefined,
      city: city || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sort: sortBy,
      page: nextPage,
      page_size: PAGE_SIZE,
    };
    doSearch(params, true);
  };

  const hasMore = results.length < total;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 搜索活动</h1>
        <p className="text-gray-500">发现你感兴趣的活动</p>
      </div>

      {/* 大搜索框 */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="input-field pl-12 text-lg py-3"
            placeholder="搜索活动名称、标签、关键词..."
            aria-label="搜索活动"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                handleFilterChange();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="清空搜索"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* 筛选栏 */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 分类 */}
          <div>
            <label htmlFor="filter-category" className="block text-xs font-medium text-gray-500 mb-1">分类</label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                handleFilterChange();
              }}
              className="input-field py-1.5 text-sm"
            >
              <option value="">全部分类</option>
              {categories.filter((c) => c !== '全部').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 城市 */}
          <div>
            <label htmlFor="filter-city" className="block text-xs font-medium text-gray-500 mb-1">城市</label>
            <input
              id="filter-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={handleFilterChange}
              className="input-field py-1.5 text-sm"
              placeholder="输入城市"
            />
          </div>

          {/* 开始日期 */}
          <div>
            <label htmlFor="filter-start" className="block text-xs font-medium text-gray-500 mb-1">开始日期</label>
            <input
              id="filter-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleFilterChange();
              }}
              className="input-field py-1.5 text-sm"
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label htmlFor="filter-end" className="block text-xs font-medium text-gray-500 mb-1">结束日期</label>
            <input
              id="filter-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                handleFilterChange();
              }}
              className="input-field py-1.5 text-sm"
            />
          </div>
        </div>

        {/* 排序切换 */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">排序：</span>
          <div className="flex gap-1" role="group" aria-label="排序方式">
            <button
              onClick={() => {
                setSortBy('latest');
                handleFilterChange();
              }}
              aria-pressed={sortBy === 'latest'}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                sortBy === 'latest'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🕐 最新
            </button>
            <button
              onClick={() => {
                setSortBy('popular');
                handleFilterChange();
              }}
              aria-pressed={sortBy === 'popular'}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                sortBy === 'popular'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔥 最热
            </button>
          </div>

          {/* 重置按钮 */}
          <button
            onClick={() => {
              setQuery('');
              setCategory('');
              setCity('');
              setStartDate('');
              setEndDate('');
              setSortBy('latest');
              setTimeout(() => performSearch(), 0);
            }}
            className="ml-auto text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ↺ 重置筛选
          </button>
        </div>
      </div>

      {/* 离线提示 */}
      {usingMock && !loading && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3">
          ⚠️ 后端服务未连接，当前显示模拟数据。
        </div>
      )}

      {/* 结果统计 */}
      {!loading && results.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            共找到 <span className="font-medium text-gray-700">{total}</span> 个活动
          </p>
        </div>
      )}

      {/* 搜索结果 */}
      {loading && results.length === 0 ? (
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
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={performSearch} className="btn-secondary">重新搜索</button>
        </div>
      ) : results.length === 0 ? (
        // 空状态
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500 text-lg mb-2">没有找到匹配的活动</p>
          <p className="text-gray-400 text-sm mb-4">试试调整搜索关键词或筛选条件</p>
          <Link to="/events/create" className="btn-primary inline-flex">
            创建活动
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* 加载更多 */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? '加载中...' : `加载更多（剩余 ${total - results.length} 个）`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
