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
  const singleMarkerRef = useRef<any>(null);
  const [mapError, setMapError] = useState('');

  // 初始化地图（只执行一次）
  useEffect(() => {
    if (!mapRef.current) return;

    let disposed = false;
    const amapKey = import.meta.env.VITE_AMAP_KEY || '';

    if (!amapKey) {
      setMapError('未配置高德地图 API Key');
      return;
    }

    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.InfoWindow', 'AMap.Geocoder'],
    }).then((AMap) => {
      if (disposed || !mapRef.current) return;

      const map = new AMap.Map(mapRef.current, {
        zoom,
        center: [center[1], center[0]],
        viewMode: '2D',
        mapStyle: 'amap://styles/normal',
      });
      mapInstanceRef.current = map;

      // 事件多点标记
      if (events.length > 0) {
        const markers = events
          .filter((e) => e.latitude && e.longitude)
          .map((event) => {
            const marker = new AMap.Marker({
              position: [event.longitude, event.latitude],
              title: event.title,
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
            marker.on('click', () => infoWindow.open(map, marker.getPosition()));
            return marker;
          });
        map.add(markers);
        markersRef.current = markers;
        if (markers.length > 0) map.setFitView(markers, false, [60, 60, 60, 60]);
      }

      // 初始单点标记
      if (singleMarker && singleMarker.lat && singleMarker.lng) {
        const marker = new AMap.Marker({
          position: [singleMarker.lng, singleMarker.lat],
          title: singleMarker.title,
        });
        map.add(marker);
        singleMarkerRef.current = marker;
        map.setCenter([singleMarker.lng, singleMarker.lat]);
        if (zoom < 10) map.setZoom(14);
      }

      // 点击事件
      if (onMapClick) {
        map.on('click', (e: any) => {
          onMapClick(e.lnglat.getLat(), e.lnglat.getLng());
        });
      }

      if (interactive) map.setStatus({ scrollWheel: true });
    }).catch((err: Error) => {
      console.error('Failed to load AMap:', err);
      setMapError(`高德地图加载失败：${err.message || '请检查 API Key 是否正确'}`);
    });

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
      singleMarkerRef.current = null;
    };
    // 地图只初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 单独更新单点标记位置（不重建地图）
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !singleMarker || !singleMarker.lat || !singleMarker.lng) return;

    const AMap = (window as any).AMap;
    const pos = [singleMarker.lng, singleMarker.lat];

    if (singleMarkerRef.current) {
      // 已有标记 → 移动位置
      singleMarkerRef.current.setPosition(pos);
      singleMarkerRef.current.setTitle(singleMarker.title);
    } else {
      // 新建标记
      const marker = new (AMap as any).Marker({ position: pos, title: singleMarker.title });
      map.add(marker);
      singleMarkerRef.current = marker;
    }

    // 平滑移动地图中心到标记位置
    map.setCenter(pos, true);
    if (map.getZoom() < 10) map.setZoom(14);
  }, [singleMarker]);

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