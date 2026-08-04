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
  const autoCompleteRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const amapKey = import.meta.env.VITE_AMAP_KEY || '';

  // 加载 AMap 搜索服务
  useEffect(() => {
    if (!amapKey) {
      setAmapError('未配置高德地图 API Key');
      return;
    }
    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.Geocoder'],
    }).then((AMap) => {
      autoCompleteRef.current = new AMap.AutoComplete({ city: '北京', citylimit: true });
      placeSearchRef.current = new AMap.PlaceSearch({ city: '北京', citylimit: true });
    }).catch((err) => {
      setAmapError(`地图服务加载失败：${err.message || ''}`);
    });
  }, [amapKey]);

  // 同步外部 value 变化（如地图选点后回填）
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 防抖搜索
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
        setSuggestions(result.tips.slice(0, 8));
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => doSearch(val), 300);
  };

  // 选中建议 → 获取详细坐标并回调
  const handleSelect = (tip: any) => {
    setShowDropdown(false);
    setInputValue(tip.name);

    if (placeSearchRef.current && tip.id) {
      placeSearchRef.current.getDetails(tip.id, (status: string, result: any) => {
        if (status === 'complete' && result?.poiList?.pois?.length) {
          const poi = result.poiList.pois[0];
          const loc = poi.location;
          onSelect({
            name: poi.name,
            lat: loc.getLat(),
            lng: loc.getLng(),
            address: poi.pname + poi.cityname + poi.adname + poi.address,
          });
        } else if (tip.location) {
          const [lng, lat] = tip.location.split(',').map(Number);
          onSelect({ name: tip.name, lat, lng, address: tip.district || tip.address || tip.name });
        }
      });
    } else if (tip.location) {
      const [lng, lat] = tip.location.split(',').map(Number);
      onSelect({ name: tip.name, lat, lng, address: tip.district || tip.address || tip.name });
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
          className="input-field pl-10"
          placeholder={placeholder || '搜索地点名称，如：温榆河公园、朝阳大悦城'}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">搜索中...</span>
        )}
      </div>

      {amapError && (
        <p className="text-xs text-red-500 mt-1">{amapError}</p>
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((tip, idx) => (
            <li
              key={tip.id || idx}
              onClick={() => handleSelect(tip)}
              className="px-4 py-2.5 hover:bg-primary-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="text-sm font-medium text-gray-800">{tip.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {tip.district || ''}
                {tip.address ? ` ${tip.address}` : ''}
                {tip.type && <span className="ml-2 text-primary-500">{tip.type}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}