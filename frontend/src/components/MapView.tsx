import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { Event } from '../types';

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
  center = [35.86166, 104.195397],
  zoom = 4,
  height = '400px',
  singleMarker,
  onMapClick,
  interactive = false,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (!mapRef.current) return;

    let disposed = false;
    const amapKey = import.meta.env.VITE_AMAP_KEY || '';

    if (!amapKey) {
      setMapError('未配置高德地图 API Key，请在 frontend/.env 中设置 VITE_AMAP_KEY');
      return;
    }

    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.InfoWindow'],
    }).then((AMap) => {
      if (disposed || !mapRef.current) return;

      const map = new AMap.Map(mapRef.current, {
        zoom,
        center: [center[1], center[0]], // AMap uses [lng, lat]
        viewMode: '2D',
        mapStyle: 'amap://styles/normal',
      });

      mapInstanceRef.current = map;

      // Add markers for events (multi-marker mode)
      if (events.length > 0) {
        const markers = events
          .filter((e) => e.latitude && e.longitude)
          .map((event) => {
            const marker = new AMap.Marker({
              position: new AMap.LngLat(event.longitude, event.latitude),
              title: event.title,
              extData: event,
            });

            const infoContent = `
              <div style="padding:4px 0;min-width:200px;font-family:system-ui,sans-serif;">
                <h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#111;">${event.title}</h3>
                <p style="font-size:12px;color:#666;margin:0 0 4px;">📍 ${event.location_name || ''}</p>
                <p style="font-size:12px;color:#666;margin:0 0 8px;">${new Date(event.start_time).toLocaleString('zh-CN')}</p>
                <a href="/events/${event.id}" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:500;">查看详情 →</a>
              </div>
            `;

            const infoWindow = new AMap.InfoWindow({
              content: infoContent,
              offset: new AMap.Pixel(0, -30),
              closeWhenClickMap: true,
            });

            marker.on('click', () => {
              infoWindow.open(map, marker.getPosition());
            });

            return marker;
          });

        map.add(markers);
        markersRef.current = markers;

        // Auto-fit to show all markers
        if (markers.length > 0) {
          map.setFitView(markers, false, [60, 60, 60, 60]);
        }
      }

      // Single marker mode (event detail / create event)
      if (singleMarker && singleMarker.lat && singleMarker.lng) {
        const marker = new AMap.Marker({
          position: new AMap.LngLat(singleMarker.lng, singleMarker.lat),
          title: singleMarker.title,
        });
        map.add(marker);
        markersRef.current = [marker];
      }

      // Map click handler (interactive mode for creating events)
      if (onMapClick) {
        map.on('click', (e: any) => {
          onMapClick(e.lnglat.getLat(), e.lnglat.getLng());
        });
      }

      // Enable scroll zoom in interactive mode
      if (interactive) {
        map.setStatus({ scrollWheel: true });
      }
    }).catch((err: Error) => {
      console.error('Failed to load AMap:', err);
      setMapError(`高德地图加载失败：${err.message || '请检查 API Key 是否正确，或该 Key 是否已添加当前域名到白名单'}`);
    });

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, [events, singleMarker, center, zoom, onMapClick, interactive]);

  return (
    <>
      {mapError && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-xl p-6 text-center" style={{ height }}>
          <div>
            <div className="text-4xl mb-3">🗺️</div>
            <p className="text-red-600 text-sm font-medium mb-1">地图加载失败</p>
            <p className="text-red-500 text-xs">{mapError}</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className={`rounded-xl overflow-hidden border border-gray-200 ${mapError ? 'hidden' : ''}`}
        style={{ width: '100%', height }}
      />
    </>
  );
}
