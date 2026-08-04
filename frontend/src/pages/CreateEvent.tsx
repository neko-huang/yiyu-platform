import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MapView from '../components/MapView';
import client from '../api/client';
import { createCategories, eventTypes } from '../utils/constants';
import { getErrorMessage } from '../utils/errors';

interface FormData {
  title: string;
  description: string;
  type: 'offline' | 'online' | 'hybrid';
  category: string;
  start_time: string;
  end_time: string;
  location_name: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  price: number;
  tags: string;
}

export default function CreateEvent() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>(() => {
    // 从 sessionStorage 读取 AI 策划结构化数据（优先于旧版纯文本）
    let aiTitle = '';
    let aiDescription = '';
    let aiTags = '';
    let aiCategory = '';
    let aiMaxParticipants = 50;

    const aiPlanData = sessionStorage.getItem('aiPlanData');
    if (aiPlanData) {
      try {
        const parsed = JSON.parse(aiPlanData);
        aiTitle = parsed.title || '';
        aiDescription = parsed.description || '';
        aiTags = parsed.tags || '';
        aiCategory = parsed.category || '';
        aiMaxParticipants = parsed.max_participants || 50;
        sessionStorage.removeItem('aiPlanData');
      } catch { /* ignore */ }
    }

    // 旧版：从 sessionStorage 读取 AI 策划纯文本内容（降级）
    if (!aiDescription) {
      const aiPlan = sessionStorage.getItem('aiPlanContent');
      if (aiPlan) {
        aiDescription = aiPlan;
        sessionStorage.removeItem('aiPlanContent');
      }
    }

    // 从 sessionStorage 读取 SOP 模板内容预填
    const sopRaw = sessionStorage.getItem('sopTemplateContent');
    let sopData: { title?: string; description?: string; tags?: string; category?: string } | null = null;
    if (sopRaw) {
      try {
        sopData = JSON.parse(sopRaw);
        sessionStorage.removeItem('sopTemplateContent');
      } catch { /* ignore */ }
    }
    return {
      title: sopData?.title || aiTitle,
      description: sopData?.description || aiDescription,
      type: 'offline',
      category: sopData?.category || aiCategory || '户外',
      start_time: '',
      end_time: '',
      location_name: '',
      latitude: 39.9042,
      longitude: 116.4074,
      max_participants: aiMaxParticipants,
      price: 0,
      tags: sopData?.tags || aiTags,
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  // AI 模态框：Escape 键关闭
  const closeModal = useCallback(() => setShowAIModal(false), []);
  useEffect(() => {
    if (!showAIModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAIModal, closeModal]);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // 表单验证
    if (!formData.title.trim()) {
      setError('请输入活动标题');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setError('请选择活动时间');
      return;
    }
    // 验证结束时间晚于开始时间
    if (new Date(formData.end_time) <= new Date(formData.start_time)) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    // 验证人数上限
    if (formData.max_participants < 1) {
      setError('人数上限至少为1');
      return;
    }
    // 验证价格不为负
    if (formData.price < 0) {
      setError('参与费用不能为负数');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          .split(/[,，\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
        status: 'draft',
      };
      const res = await client.post('/events', payload);
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err, '创建活动失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">创建活动</h1>
          <p className="text-gray-500 text-sm mt-1">填写活动信息，创建你的精彩活动</p>
        </div>
        <button
          onClick={() => setShowAIModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <span className="text-lg" aria-hidden="true">✨</span>
          <span>AI帮我策划</span>
        </button>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="AI活动策划助手"
        >
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">✨ AI 活动策划助手</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
                aria-label="关闭对话框"
              >
                ×
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              告诉 AI 你想举办什么样的活动，它将为你生成完整的活动方案。
            </p>
            <div className="space-y-3 mb-4">
              <input
                type="text"
                className="input-field"
                placeholder="例如：周末户外徒步活动，适合家庭参与..."
                id="ai-prompt-input"
                aria-label="AI策划提示词"
              />
              <button
                onClick={() => {
                  navigate('/ai-plan');
                }}
                className="btn-primary w-full"
              >
                前往 AI 策划页面 →
              </button>
            </div>
            <div className="text-sm text-gray-400">
              💡 提示：AI 策划页面支持对话式交互，可以不断完善方案
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3" role="alert">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>

          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-1.5">活动标题 *</label>
            <input
              id="event-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="input-field"
              placeholder="给你的活动起个好名字"
              required
            />
          </div>

          <div>
            <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-1.5">活动描述</label>
            <textarea
              id="event-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input-field min-h-[120px] resize-y"
              placeholder="详细描述你的活动内容、亮点、注意事项等..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-type" className="block text-sm font-medium text-gray-700 mb-1.5">活动类型</label>
              <select
                id="event-type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="input-field"
              >
                {eventTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 mb-1.5">活动分类</label>
              <select
                id="event-category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="input-field"
              >
                {createCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Time & location */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">时间与地点</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-start" className="block text-sm font-medium text-gray-700 mb-1.5">开始时间 *</label>
              <input
                id="event-start"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="event-end" className="block text-sm font-medium text-gray-700 mb-1.5">结束时间 *</label>
              <input
                id="event-end"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-1.5">地点名称</label>
            <input
              id="event-location"
              type="text"
              value={formData.location_name}
              onChange={(e) => handleChange('location_name', e.target.value)}
              className="input-field"
              placeholder="如：北京香山公园"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-lat" className="block text-sm font-medium text-gray-700 mb-1.5">纬度</label>
              <input
                id="event-lat"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', parseFloat(e.target.value) || 0)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="event-lng" className="block text-sm font-medium text-gray-700 mb-1.5">经度</label>
              <input
                id="event-lng"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', parseFloat(e.target.value) || 0)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              📍 点击地图选取位置
            </label>
            <MapView
              singleMarker={{ lat: formData.latitude, lng: formData.longitude, title: formData.location_name || '活动地点' }}
              center={[formData.latitude, formData.longitude]}
              zoom={10}
              height="300px"
              interactive
              onMapClick={handleMapClick}
            />
          </div>
        </div>

        {/* Participation & pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">参与与定价</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-max-participants" className="block text-sm font-medium text-gray-700 mb-1.5">人数上限</label>
              <input
                id="event-max-participants"
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || 0)}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="event-price" className="block text-sm font-medium text-gray-700 mb-1.5">参与费用 (元)</label>
              <input
                id="event-price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">0 表示免费</p>
            </div>
          </div>

          <div>
            <label htmlFor="event-tags" className="block text-sm font-medium text-gray-700 mb-1.5">活动标签</label>
            <input
              id="event-tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="input-field"
              placeholder="用逗号分隔，如：徒步, 登山, 户外"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link to="/" className="btn-secondary">取消</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '保存中...' : '保存为草稿'}
          </button>
        </div>
      </form>
    </div>
  );
}
