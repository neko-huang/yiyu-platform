import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Event } from '../types';

// 修复 Leaflet 默认图标问题
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  events?: Event[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  singleMarker?: { lat: number; lng: number; title: string };
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

/** 子组件：通过 useMapEvents 监听地图点击事件 */
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView({
  events = [],
  center = [35.86166, 104.195397], // 中国中心点
  zoom = 4,
  height = '400px',
  singleMarker,
  onMapClick,
  interactive = false,
}: MapViewProps) {
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={center as [number, number]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={interactive}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* 地图点击事件处理（仅在交互模式下） */}
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}

        {/* Single marker mode (for event detail / create event) */}
        {singleMarker && (
          <Marker position={[singleMarker.lat, singleMarker.lng]}>
            <Popup>{singleMarker.title}</Popup>
          </Marker>
        )}

        {/* Multiple markers mode (for map page) */}
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
          >
            <Popup>
              <div className="min-w-[180px]">
                <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-1">📍 {event.location_name}</p>
                <p className="text-sm text-gray-600 mb-2">
                  {new Date(event.start_time).toLocaleString('zh-CN')}
                </p>
                <a
                  href={`/events/${event.id}`}
                  className="text-primary-600 text-sm font-medium hover:underline"
                >
                  查看详情 →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
