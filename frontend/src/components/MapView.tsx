import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { Event } from '../types';

interface MapViewProps {
  events?: Event[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  singleMarker?: { lat: number; lng: number; title: string };
  onMapClick?: (lat: number, lng: number, address?: string) => void;
  interactive?: boolean;
  focusedEventId?: number | null;
}

/** Escape special characters to prevent XSS in HTML strings */
function escapeHtml(str: string): string {
  return str
    .replace(/\&/g, '\&amp;')
    .replace(/\</g, '\&lt;')
    .replace(/\>/g, '\&gt;')
    .replace(/"/g, '\&quot;')
    .replace(/'/g, '\&#39;');
}

export default function MapView({
  events = [],
  center = [35.86166, 104.195397],
  zoom = 4,
  height = '400px',
  singleMarker,
  onMapClick,
  interactive = false,
  focusedEventId,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const singleMarkerRef = useRef<any>(null);
  const onMapClickRef = useRef(onMapClick);
  const [mapError, setMapError] = useState('');

  // 保持 onMapClick 引用最新
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

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
      plugins: ['AMap.Marker', 'AMap.InfoWindow', 'AMap.Geocoder', 'AMap.AutoComplete', 'AMap.PlaceSearch'],
    }).then((AMap: any) => {
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
        const markers: any[] = [];
        const markerMap: Record<number, { marker: any; infoWindow: any }> = {};
        events
          .filter((e) => e.latitude && e.longitude)
          .forEach((event) => {
            const marker = new AMap.Marker({
              position: [event.longitude, event.latitude],
              title: event.title,
            });
            const infoContent = `
              <div style="padding:4px 0;min-width:200px;font-family:system-ui,sans-serif;">
                <h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#111;">${escapeHtml(event.title)}</h3>
                <p style="font-size:12px;color:#666;margin:0 0 4px;">📍 ${escapeHtml(event.location_name || '')}</p>
                <p style="font-size:12px;color:#666;margin:0 0 8px;">${escapeHtml(new Date(event.start_time).toLocaleString('zh-CN'))}</p>
                <a href="/events/${event.id}" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:500;">查看详情 →</a>
              </div>
            `;
            const infoWindow = new AMap.InfoWindow({
              content: infoContent,
              offset: new AMap.Pixel(0, -30),
              closeWhenClickMap: true,
            });
            marker.on('click', () => infoWindow.open(map, marker.getPosition()));
            markers.push(marker);
            markerMap[event.id] = { marker, infoWindow };
          });
        map.add(markers);
        (markersRef as any).current = markers;
        (window as any).__yiyuMarkerMap = markerMap;
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
        if (map.getZoom() < 10) map.setZoom(14);
      }

      // 点击事件 — 逆地理编码获取地点名称
      // 在闭包内捕获 AMap 引用，确保插件可用
      if (onMapClickRef.current) {
        map.on('click', (e: any) => {
          const lat = e.lnglat.getLat();
          const lng = e.lnglat.getLng();

          // 使用闭包中的 AMap 创建 Geocoder，确保插件可用
          try {
            const geocoder = new AMap.Geocoder({ city: '' });
            geocoder.getAddress([lng, lat], (status: string, result: any) => {
              let address: string | undefined;
              if (status === 'complete' && result && result.regeocode) {
                const rg = result.regeocode;
                // 优先使用附近 POI 名称
                if (rg.pois && rg.pois.length > 0) {
                  address = rg.pois[0].name;
                }
                // 其次使用格式化地址
                if (!address && rg.formattedAddress) {
                  address = rg.formattedAddress;
                }
                // 最后拼接地址组件
                if (!address && rg.addressComponent) {
                  const ac = rg.addressComponent;
                  address = [ac.province || '', ac.city || '', ac.district || '', ac.street || '', ac.streetNumber || '']
                    .filter(Boolean).join('');
                }
              }
              // 如果逆地理编码完全失败，用坐标作为兜底
              if (!address) {
                address = `${lat.toFixed(4)}, ${lng.toFixed(4)} 附近`;
              }
              onMapClickRef.current?.(lat, lng, address);
            });
          } catch (err) {
            console.error('逆地理编码失败:', err);
            // 兜底：至少传坐标信息
            onMapClickRef.current?.(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)} 附近`);
          }
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
    if (!map) return;
    if (!singleMarker || !singleMarker.lat || !singleMarker.lng) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    const pos: [number, number] = [singleMarker.lng, singleMarker.lat];

    if (singleMarkerRef.current) {
      singleMarkerRef.current.setPosition(pos);
      singleMarkerRef.current.setTitle(singleMarker.title);
    } else {
      const marker = new AMap.Marker({
        position: pos,
        title: singleMarker.title,
      });
      map.add(marker);
      singleMarkerRef.current = marker;
    }

    map.setCenter(pos, true);
    if (map.getZoom() < 10) map.setZoom(14);
  }, [singleMarker]);

  // 聚焦到指定事件标记
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedEventId) return;

    const markerMap = (window as any).__yiyuMarkerMap;
    if (!markerMap || !markerMap[focusedEventId]) return;

    const { marker, infoWindow } = markerMap[focusedEventId];
    const pos = marker.getPosition();
    map.setCenter(pos, true);
    if (map.getZoom() < 13) map.setZoom(13);
    infoWindow.open(map, pos);
  }, [focusedEventId]);

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
