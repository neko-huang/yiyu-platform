import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Event } from '../types';

// 修复 Leaflet 默认图标问题
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
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

export default function MapView({
  events = [],
  center = [35.86166, 104.195397], // 中国中心点
  zoom = 4,
  height = '400px',
  singleMarker,
  onMapClick,
  interactive = false,
}: MapViewProps) {
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (onMapClick) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  };

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={center as [number, number]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={interactive}
        eventHandlers={onMapClick ? { click: handleMapClick } : undefined}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

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
