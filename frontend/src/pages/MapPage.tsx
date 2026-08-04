import { useState, useEffect, useCallback } from 'react';
import MapView from '../components/MapView';
import client from '../api/client';
import type { Event } from '../types';



export default function MapPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // /events/map 已排除线上活动，只返回有经纬度坐标的活动
      const res = await client.get('/events/map');
      const items = Array.isArray(res.data) ? res.data : [];
      setEvents(items);
    } catch {
      // 后端未启动，无数据
      setEvents([]);
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
          ) : (
            <div className="relative w-full h-full">
              <MapView events={events} center={[35.86166, 104.195397]} zoom={4} height="100%" interactive />
              {events.length === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 text-sm text-gray-500">
                  暂无活动，地图上未显示标记
                </div>
              )}
            </div>
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
