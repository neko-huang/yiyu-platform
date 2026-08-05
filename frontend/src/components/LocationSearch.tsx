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

interface PoiItem {
  name: string;
  location: { getLng: () => number; getLat: () => number };
  address: string;
  district: string;
  cityname?: string;
  pname?: string;
  adname?: string;
  type?: string;
}

const TYPE_ICONS: Record<string, string> = {
  '餐饮': '🍽️', '美食': '️', '咖啡': '🍽️',
  '购物': '🛒', '商场': '🛒',
  '风景': '🏞️', '景点': '🏞️', '公园': '🏞️',
  '交通': '🚇', '地铁': '🚇', '公交': '',
  '酒店': '🏨', '住宿': '🏨',
  '医疗': '🏥', '医院': '',
  '教育': '🏫', '学校': '🏫', '大学': '🏫',
  '运动': '', '健身': '🏃',
  '娱乐': '🎮', '休闲': '🎮',
  '宠物': '', '动物': '🐾',
  '社区': '🏠', '生活': '🏠',
};

function getIcon(type?: string): string {
  if (!type) return '📍';
  for (const [key, icon] of Object.entries(TYPE_ICONS)) {
    if (type.includes(key)) return icon;
  }
  return '📍';
}

export default function LocationSearch({ value, onSelect, placeholder }: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PoiItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [amapReady, setAmapReady] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoCompleteRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const amapRef = useRef<any>(null);

  // 加载高德 JS API 并初始化 AutoComplete
  useEffect(() => {
    let disposed = false;
    const amapKey = import.meta.env.VITE_AMAP_KEY || '';
    if (!amapKey) return;

    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: ['AMap.AutoComplete', 'AMap.PlaceSearch'],
    }).then((AMap: any) => {
      if (disposed) return;
      amapRef.current = AMap;

      // AutoComplete: 输入联想
      const autoComplete = new AMap.AutoComplete({
        city: '全国',
        citylimit: false,
      });
      autoCompleteRef.current = autoComplete;

      // PlaceSearch: 点击时获取 POI 详情（含精确坐标）
      const placeSearch = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 10,
      });
      placeSearchRef.current = placeSearch;

      // 输入时自动搜索联想
      autoComplete.on('select', (e: any) => {
        const poi = e.poi as PoiItem;
        handlePoiSelect(poi);
      });

      setAmapReady(true);
    }).catch((err: Error) => {
      console.error('LocationSearch: AMap load failed', err);
      setErrorMsg('地图服务加载失败，请刷新页面重试');
    });

    return () => {
      disposed = true;
      autoCompleteRef.current = null;
      placeSearchRef.current = null;
      amapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 选中 POI → 通过 PlaceSearch 获取精确坐标
  const handlePoiSelect = useCallback((poi: PoiItem) => {
    const ps = placeSearchRef.current;
    if (!ps || !poi.name) return;

    // 如果 autoComplete 的 poi 已有 location，直接用
    if (poi.location && typeof poi.location.getLng === 'function') {
      const result: LocationResult = {
        name: poi.name,
        lat: poi.location.getLat(),
        lng: poi.location.getLng(),
        address: buildAddress(poi),
      };
      onSelect(result);
      setInputValue(poi.name);
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // 否则通过 PlaceSearch 搜索获取精确坐标
    ps.search(poi.name, (status: string, psResult: any) => {
      if (status === 'complete' && psResult?.poiList?.pois?.length) {
        const first = psResult.poiList.pois[0];
        const loc = first.location;
        const result: LocationResult = {
          name: first.name || poi.name,
          lat: loc.getLat(),
          lng: loc.getLng(),
          address: buildAddress(first),
        };
        onSelect(result);
        setInputValue(first.name || poi.name);
      } else {
        setErrorMsg('无法获取该地点的精确坐标');
      }
      setSuggestions([]);
      setShowDropdown(false);
    });
  }, [onSelect]);

  const buildAddress = (poi: PoiItem): string => {
    const parts = [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean);
    return parts.join('');
  };

  // 输入变化 → 手动触发搜索联想（展示下拉列表）
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setErrorMsg('');

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const ac = autoCompleteRef.current;
    if (!ac) return;

    ac.search(val, (status: string, result: any) => {
      if (status === 'complete' && result?.tips?.length) {
        setSuggestions(result.tips);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(true);
      }
    });
  }, []);

  // 同步外部 value 变化（如地图选点后回填）
  useEffect(() => {
    setInputValue(value);
  }, [value]);

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

  const handleTipClick = (tip: PoiItem) => {
    // 构造一个有 location 的对象给 handlePoiSelect
    const tipWithLocation = {
      ...tip,
      location: tip.location,
    };
    handlePoiSelect(tipWithLocation);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">📍</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          className="input-field pl-10 pr-10"
          placeholder={placeholder || '搜索地点名称，如：天安门、温榆河公园、朝阳大悦城'}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
          {!amapReady ? (
            <span className="text-gray-400 animate-pulse">加载中…</span>
          ) : (
            <span className="text-gray-300">🔍</span>
          )}
        </span>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((tip, idx) => (
            <li
              key={(tip as any).id || idx}
              onClick={() => handleTipClick(tip)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">{getIcon((tip as any).type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{tip.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {tip.district || ''}
                    {tip.address ? ` ${tip.address}` : ''}
                  </div>
                  {(tip as any).type && (
                    <div className="text-xs text-blue-500 mt-0.5 truncate">{(tip as any).type}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showDropdown && suggestions.length === 0 && inputValue.trim().length >= 2 && amapReady && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-400">未找到匹配的地点</p>
          <p className="text-xs text-gray-300 mt-1">试试换个关键词搜索</p>
        </div>
      )}
    </div>
  );
}
