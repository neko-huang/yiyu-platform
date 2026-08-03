import { useState, useEffect, useCallback } from 'react';
import MapView from '../components/MapView';
import client from '../api/client';
import type { Event } from '../types';

// 模拟数据 - 覆盖多个城市的活动
const mockEvents: Event[] = [
  { id: 1, title: '周末香山徒步登山活动', description: '香山红叶徒步', organizer_id: 1, type: 'offline', category: '户外', start_time: '2026-08-10T08:00:00', end_time: '2026-08-10T16:00:00', location_name: '北京香山公园', latitude: 39.9929, longitude: 116.1883, max_participants: 50, current_participants: 32, price: 50, status: 'published', tags: ['徒步'] },
  { id: 2, title: '城市民谣音乐之夜', description: '民谣现场演出', organizer_id: 2, type: 'offline', category: '音乐', start_time: '2026-08-15T19:30:00', end_time: '2026-08-15T22:00:00', location_name: '上海·思南公馆', latitude: 31.2226, longitude: 121.4737, max_participants: 100, current_participants: 67, price: 88, status: 'published', tags: ['民谣'] },
  { id: 3, title: '《人类简史》读书分享会', description: '读书分享', organizer_id: 3, type: 'hybrid', category: '读书', start_time: '2026-08-12T14:00:00', end_time: '2026-08-12T17:00:00', location_name: '杭州·钟书阁', latitude: 30.2741, longitude: 120.1551, max_participants: 30, current_participants: 30, price: 0, status: 'published', tags: ['读书'] },
  { id: 4, title: '城市马拉松挑战赛', description: '半程马拉松', organizer_id: 4, type: 'offline', category: '运动', start_time: '2026-08-20T07:00:00', end_time: '2026-08-20T12:00:00', location_name: '成都·锦城湖公园', latitude: 30.5728, longitude: 104.0668, max_participants: 500, current_participants: 287, price: 120, status: 'published', tags: ['跑步'] },
  { id: 5, title: 'AI与大模型技术前沿讲座', description: '技术讲座', organizer_id: 5, type: 'online', category: '讲座', start_time: '2026-08-08T19:00:00', end_time: '2026-08-08T21:00:00', location_name: '线上·腾讯会议', latitude: 39.9042, longitude: 116.4074, max_participants: 200, current_participants: 156, price: 0, status: 'published', tags: ['AI'] },
  { id: 6, title: '夏日户外烧烤派对', description: '烧烤派对', organizer_id: 6, type: 'offline', category: '美食', start_time: '2026-08-18T11:00:00', end_time: '2026-08-18T20:00:00', location_name: '北京·怀柔山吧', latitude: 40.3156, longitude: 116.6312, max_participants: 40, current_participants: 18, price: 158, status: 'published', tags: ['烧烤'] },
  { id: 7, title: '深圳科技创业沙龙', description: '创业分享', organizer_id: 7, type: 'offline', category: '科技', start_time: '2026-08-14T14:00:00', end_time: '2026-08-14T17:00:00', location_name: '深圳·南山科技园', latitude: 22.5431, longitude: 113.9445, max_participants: 80, current_participants: 45, price: 0, status: 'published', tags: ['创业'] },
  { id: 8, title: '广州美食文化节', description: '美食文化', organizer_id: 8, type: 'offline', category: '美食', start_time: '2026-08-22T10:00:00', end_time: '2026-08-22T20:00:00', location_name: '广州·天河城', latitude: 23.1291, longitude: 113.2644, max_participants: 200, current_participants: 89, price: 30, status: 'published', tags: ['美食'] },
  { id: 9, title: '西安古城墙夜跑', description: '夜跑活动', organizer_id: 9, type: 'offline', category: '运动', start_time: '2026-08-16T19:00:00', end_time: '2026-08-16T21:00:00', location_name: '西安·古城墙', latitude: 34.3416, longitude: 108.9398, max_participants: 100, current_participants: 56, price: 20, status: 'published', tags: ['夜跑'] },
  { id: 10, title: '武汉樱花摄影展', description: '摄影展览', organizer_id: 10, type: 'offline', category: '艺术', start_time: '2026-08-11T09:00:00', end_time: '2026-08-11T17:00:00', location_name: '武汉·东湖', latitude: 30.5928, longitude: 114.3055, max_participants: 60, current_participants: 34, price: 0, status: 'published', tags: ['摄影'] },
];

export default function MapPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/events', { params: { status: 'published' } });
      setEvents(res.data);
    } catch {
      // 后端未启动，使用模拟数据
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">🗺️ 活动地图</h1>
          <p className="text-xs text-gray-500">在地图上发现身边的活动</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>共 {events.length} 个活动</span>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500" role="status" aria-label="加载中"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="text-5xl mb-3">🗺️</div>
                <p className="text-gray-500 mb-4">暂无活动</p>
                <button onClick={fetchEvents} className="btn-secondary">刷新</button>
              </div>
            </div>
          ) : (
            <MapView events={events} center={[35.86166, 104.195397]} zoom={4} height="100%" interactive />
          )}
        </div>

        {/* Event list sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden lg:block">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-3">活动列表</h2>
            <div className="space-y-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  aria-label={`查看 ${event.title}`}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedEvent?.id === event.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{event.title}</h3>
                    <span className={`tag flex-shrink-0 ml-2 ${
                      event.price === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {event.price === 0 ? '免费' : `¥${event.price}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span aria-hidden="true">📍</span>
                    <span className="line-clamp-1">{event.location_name}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(event.start_time).toLocaleDateString('zh-CN')}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="tag bg-blue-100 text-blue-700">{event.category}</span>
                    <span className="text-xs text-gray-400">
                      {event.current_participants}/{event.max_participants}人
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected event detail popup (mobile) */}
      {selectedEvent && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50"
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-label={selectedEvent.title}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{selectedEvent.title}</h3>
            <button className="text-gray-400 text-xl" aria-label="关闭" onClick={() => setSelectedEvent(null)}>×</button>
          </div>
          <p className="text-sm text-gray-500">📍 {selectedEvent.location_name}</p>
          <a href={`/events/${selectedEvent.id}`} className="text-primary-600 text-sm font-medium mt-2 inline-block">查看详情 →</a>
        </div>
      )}
    </div>
  );
}
