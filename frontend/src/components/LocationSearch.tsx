import { useState, useEffect, useRef, useCallback } from 'react';
import client from '../api/client';

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

interface TipItem {
  id: string;
  name: string;
  district: string;
  adcode: string;
  location: string; // "lng,lat"
  address: string;
  type?: string;
}

const TYPE_ICONS: Record<string, string> = {
  '餐饮': '🍽️', '美食': '🍽️', '咖啡': '🍽️',
  '购物': '🛒', '商场': '',
  '风景': '🏞️', '景点': '🏞️', '公园': '🏞️',
  '交通': '🚇', '地铁': '🚇', '公交': '🚇',
  '酒店': '🏨', '住宿': '🏨',
  '医疗': '', '医院': '🏥',
  '教育': '🏫', '学校': '🏫', '大学': '🏫',
  '运动': '🏃', '健身': '🏃',
  '娱乐': '🎮', '休闲': '🎮',
  '宠物': '🐾', '动物': '🐾',
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
  const [suggestions, setSuggestions] = useState<TipItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 调用后端代理接口做搜索联想（后端使用高德 Web 服务 API，无 CORS 问题）
  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setErrorMsg('');

    try {
      const resp = await client.get('/search/suggestions', {
        params: { keywords: keyword, city: '' },
        signal: controller.signal,
      });

      const data = resp.data;

      if (data.tips?.length) {
        setSuggestions(data.tips.slice(0, 10));
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
      setErrorMsg('搜索服务异常，请稍后重试');
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  }, []);

  // 从 tip.location 字段解析坐标（格式 "lng,lat"）
  const parseTipLocation = (tip: TipItem): LocationResult | null => {
    if (!tip.location || tip.location === '') return null;
    const parts = tip.location.split(',');
    if (parts.length !== 2) return null;
    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return {
      name: tip.name,
      lat,
      lng,
      address: [tip.district, tip.address].filter(Boolean).join(' '),
    };
  };

  const handleSelect = (tip: TipItem) => {
    setShowDropdown(false);
    setInputValue(tip.name);

    const result = parseTipLocation(tip);
    if (result) {
      onSelect(result);
    } else {
      setErrorMsg('无法获取该地点的精确坐标');
    }
  };

  // 同步外部 value 变化（地图选点后回填）
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 输入变化 → 防抖搜索
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

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((tip, idx) => (
            <li
              key={tip.id || idx}
              onClick={() => handleSelect(tip)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">{getIcon(tip.type)}</span>
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
