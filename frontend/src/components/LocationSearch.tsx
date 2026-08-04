import { useState, useEffect, useRef, useCallback } from 'react';

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

interface SuggestionTip {
  id: string;
  name: string;
  district: string;
  adcode: string;
  location: string;
  address: string;
  type: string;
}

export default function LocationSearch({ value, onSelect, placeholder }: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionTip[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const amapKey = import.meta.env.VITE_AMAP_KEY || '';

  // 使用高德地图 REST API 做搜索联想（不依赖 JS SDK 加载，稳定可靠）
  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim() || !amapKey) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // 取消上一次未完成的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setErrorMsg('');

    try {
      // 高德地图 Web 服务 API：输入提示（搜索联想）
      const url = `https://restapi.amap.com/v3/assistant/inputtips`
        + `?key=${encodeURIComponent(amapKey)}`
        + `&keywords=${encodeURIComponent(keyword)}`
        + `&citylimit=false`
        + `&datatype=poi`
        + `&offset=10`;

      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!resp.ok) {
        throw new Error(`搜索服务返回 ${resp.status}`);
      }

      const data = await resp.json();

      if (data.status === '1' && data.tips?.length) {
        // 过滤掉没有 location 坐标的 tips（无法定位）
        const validTips = data.tips.filter((t: any) => t.location);
        setSuggestions(validTips.slice(0, 10));
        // 始终打开下拉，这样当 validTips 为空时也能展示"未找到"提示
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        // 打开下拉以展示"未找到匹配地点"的空状态提示
        setShowDropdown(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // 被取消，忽略
      setErrorMsg('搜索服务异常，请稍后重试');
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  }, [amapKey]);

  // 用 REST API 获取 POI 详情坐标
  const fetchPoiDetail = useCallback(async (tip: SuggestionTip): Promise<LocationResult | null> => {
    // 如果 location 已存在，直接解析
    if (tip.location) {
      const parts = tip.location.split(',');
      if (parts.length === 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            name: tip.name,
            lat,
            lng,
            address: tip.district + (tip.address ? ` ${tip.address}` : ''),
          };
        }
      }
    }

    // 通过 id 获取详情（高德 POI 详情 API）
    if (tip.id) {
      try {
        const url = `https://restapi.amap.com/v3/place/detail`
          + `?key=${encodeURIComponent(amapKey)}`
          + `&id=${encodeURIComponent(tip.id)}`;

        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (data.status === '1' && data.pois?.length) {
            const poi = data.pois[0];
            const loc = poi.location;
            if (loc) {
              const parts = loc.split(',');
              if (parts.length === 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                  return {
                    name: poi.name || tip.name,
                    lat,
                    lng,
                    address: (poi.pname || '') + (poi.cityname || '') + (poi.adname || '') + (poi.address || ''),
                  };
                }
              }
            }
          }
        }
      } catch {
        // 静默失败，返回 basic 信息
      }
    }

    return null;
  }, [amapKey]);

  // 输入变化 → 防抖触发搜索
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = window.setTimeout(() => doSearch(val), 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // 选中建议 → 获取详细坐标并回调
  const handleSelect = async (tip: SuggestionTip) => {
    setShowDropdown(false);
    setInputValue(tip.name);

    const result = await fetchPoiDetail(tip);
    if (result) {
      onSelect(result);
    } else {
      // 兜底：用 tip 里的基本信息
      if (tip.location) {
        const parts = tip.location.split(',');
        if (parts.length === 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            onSelect({
              name: tip.name,
              lat,
              lng,
              address: tip.district + (tip.address ? ` ${tip.address}` : ''),
            });
            return;
          }
        }
      }
      // 最终兜底：无法获取坐标时给默认坐标并提示
      setErrorMsg('无法获取该地点的精确坐标，请尝试其他关键词或在地图上选点');
    }
  };

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

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // 根据 type 取图标
  const getTypeIcon = (type: string) => {
    if (!type) return '📍';
    const t = type.toLowerCase();
    if (t.includes('餐饮') || t.includes('美食') || t.includes('咖啡')) return '🍽️';
    if (t.includes('购物') || t.includes('商场')) return '🛒';
    if (t.includes('风景') || t.includes('景点') || t.includes('公园')) return '🏞️';
    if (t.includes('交通') || t.includes('地铁') || t.includes('公交')) return '🚇';
    if (t.includes('酒店') || t.includes('住宿')) return '🏨';
    if (t.includes('医疗') || t.includes('医院')) return '🏥';
    if (t.includes('教育') || t.includes('学校') || t.includes('大学')) return '🏫';
    if (t.includes('运动') || t.includes('健身')) return '🏃';
    if (t.includes('娱乐') || t.includes('休闲')) return '🎮';
    if (t.includes('宠物') || t.includes('动物')) return '🐾';
    if (t.includes('社区') || t.includes('生活')) return '🏠';
    return '📍';
  };

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
          placeholder={placeholder || '搜索地点名称，如：天安门、温榆河公园、朝阳大悦城'}
        />
        {/* 右侧状态图标 */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
          {searching ? (
            <span className="text-gray-400 animate-pulse">搜索中…</span>
          ) : (
            <span className="text-gray-300">🔍</span>
          )}
        </span>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}

      {!amapKey && (
        <p className="text-xs text-red-500 mt-1">未配置高德地图 API Key</p>
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((tip, idx) => (
            <li
              key={tip.id || idx}
              onClick={() => handleSelect(tip)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">{getTypeIcon(tip.type)}</span>
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

      {showDropdown && suggestions.length === 0 && !searching && inputValue.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-400">未找到匹配的地点</p>
          <p className="text-xs text-gray-300 mt-1">试试换个关键词搜索</p>
        </div>
      )}
    </div>
  );
}