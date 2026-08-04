import { useState, useEffect, useRef, useCallback } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

export interface LocationResult {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface LocationSearchProps {
  value: string;
  onSelect: (location: LocationResult) => void;
  placeholder?: string;
}

export default function LocationSearch({ value, onSelect, placeholder }: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [amapError, setAmapError] = useState('');
  const [ready, setReady] = useState(false);
  const autoCompleteRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const amapLoadedRef = useRef(false);

  const amapKey = import.meta.env.VITE_AMAP_KEY || '';

  // 初始化 AMap 搜索服务（只跑一次）
  useEffect(() => {
    if (!amapKey) {
      setAmapError('未配置高德地图 API Key');
      return;
    }
    if (amapLoadedRef.current) return;
    amapLoadedRef.current = true;

    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.Geocoder'],
    }).then((AMap) => {
      autoCompleteRef.current = new AMap.AutoComplete({ city: '北京', citylimit: true });
      placeSearchRef.current = new AMap.PlaceSearch({ city: '北京', pageSize: 5 });
      setReady(true);
    }).catch((err) => {
      // AMapLoader 可能已加载过但插件不全，尝试用 AMap.plugin 动态加载
      if ((window as any).AMap) {
        const AMap = (window as any).AMap;
        AMap.plugin(['AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.Geocoder'], () => {
          autoCompleteRef.current = new AMap.AutoComplete({ city: '北京', citylimit: true });
          placeSearchRef.current = new AMap.PlaceSearch({ city: '北京', pageSize: 5 });
          setReady(true);
        });
      } else {
        setAmapError(`地图服务加载失败：${err.message || ''}`);
      }
    });
  }, [amapKey]);

  // 同步外部 value 变化（如地图选点后回填）
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 搜索 POI
  const doSearch = useCallback((keyword: string) => {
    if (!keyword.trim() || !autoCompleteRef.current) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    autoCompleteRef.current.search(keyword, (status: string, result: any) => {
      setSearching(false);
      if (status === 'complete' && result?.tips?.length) {
        setSuggestions(result.tips.slice(0, 10));
        setShowDropdown(true);
      } else {
        // 如果 AutoComplete 没结果，尝试用 PlaceSearch 直接搜
        if (placeSearchRef.current && keyword.length >= 2) {
          placeSearchRef.current.search(keyword, (s: string, r: any) => {
            if (s === 'complete' && r?.poiList?.pois?.length) {
              const pois = r.poiList.pois.map((poi: any) => ({
                id: poi.id,
                name: poi.name,
                address: poi.address,
                district: poi.pname + poi.cityname + poi.adname,
                location: poi.location.lng + ',' + poi.location.lat,
                type: poi.type,
              }));
              setSuggestions(pois.slice(0, 10));
              setShowDropdown(true);
            } else {
              setSuggestions([]);
              setShowDropdown(false);
            }
          });
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      }
    });
  }, []);

  // 输入变化 → 防抖触发搜索
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = window.setTimeout(() => doSearch(val), 200);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // 选中建议 → 获取详细坐标并回调
  const handleSelect = (tip: any) => {
    setShowDropdown(false);
    setInputValue(tip.name);

    // 如果已有完整坐标（PlaceSearch 直接搜到的）
    if (tip.location) {
      const parts = tip.location.split(',');
      if (parts.length === 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          onSelect({ name: tip.name, lat, lng, address: tip.district || tip.address || tip.name });
          return;
        }
      }
    }

    // 通过 id 获取详情
    if (placeSearchRef.current && tip.id) {
      placeSearchRef.current.getDetails(tip.id, (status: string, result: any) => {
        if (status === 'complete' && result?.poiList?.pois?.length) {
          const poi = result.poiList.pois[0];
          const loc = poi.location;
          const lat = typeof loc.getLat === 'function' ? loc.getLat() : loc.lat;
          const lng = typeof loc.getLng === 'function' ? loc.getLng() : loc.lng;
          onSelect({
            name: poi.name,
            lat,
            lng,
            address: poi.pname + poi.cityname + poi.adname + (poi.address || ''),
          });
        }
      });
    }
  };

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">📍</span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          className="input-field pl-10 pr-10"
          placeholder={placeholder || '搜索地点名称，如：温榆河公园、朝阳大悦城'}
        />
        {/* 右侧状态图标 */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
          {searching ? (
            <span className="text-gray-400 animate-pulse">搜索中…</span>
          ) : !ready ? (
            <span className="text-gray-300">⏳</span>
          ) : inputValue && !showDropdown ? null : (
            <span className="text-gray-300">🔍</span>
          )}
        </span>
      </div>

      {amapError && (
        <p className="text-xs text-red-500 mt-1">{amapError}</p>
      )}

      {!ready && !amapError && (
        <p className="text-xs text-gray-400 mt-1">正在加载地图搜索服务…</p>
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {suggestions.map((tip, idx) => (
            <li
              key={tip.id || idx}
              onClick={() => handleSelect(tip)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5 flex-shrink-0">📍</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{tip.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {tip.district || ''}
                    {tip.address ? ` ${tip.address}` : ''}
                  </div>
                  {tip.type && (
                    <div className="text-xs text-blue-500 mt-0.5 truncate">{tip.type}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showDropdown && suggestions.length === 0 && !searching && ready && inputValue.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-400">未找到匹配的地点</p>
          <p className="text-xs text-gray-300 mt-1">试试换个关键词搜索</p>
        </div>
      )}
    </div>
  );
}