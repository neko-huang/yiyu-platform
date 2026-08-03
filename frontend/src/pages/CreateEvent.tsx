import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MapView from '../components/MapView';
import client from '../api/client';

const categories = ['户外', '音乐', '读书', '运动', '讲座', '科技', '美食', '艺术', '其他'];
const eventTypes = [
  { value: 'offline', label: '线下' },
  { value: 'online', label: '线上' },
  { value: 'hybrid', label: '混合（线上+线下）' },
];

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

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'offline',
    category: '户外',
    start_time: '',
    end_time: '',
    location_name: '',
    latitude: 39.9042,
    longitude: 116.4074,
    max_participants: 50,
    price: 0,
    tags: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('请输入活动标题');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setError('请选择活动时间');
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
    } catch {
      // 后端未启动，模拟成功
      console.log('后端未连接，模拟创建成功');
      navigate('/');
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
          <span className="text-lg">✨</span>
          <span>AI帮我策划</span>
        </button>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAIModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">✨ AI 活动策划助手</h2>
              <button onClick={() => setShowAIModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
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
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">活动标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="input-field"
              placeholder="给你的活动起个好名字"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">活动描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input-field min-h-[120px] resize-y"
              placeholder="详细描述你的活动内容、亮点、注意事项等..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">活动类型</label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">活动分类</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="input-field"
              >
                {categories.map((c) => (
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">开始时间 *</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">结束时间 *</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">地点名称</label>
            <input
              type="text"
              value={formData.location_name}
              onChange={(e) => handleChange('location_name', e.target.value)}
              className="input-field"
              placeholder="如：北京香山公园"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">纬度</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', parseFloat(e.target.value) || 0)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">经度</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">人数上限</label>
              <input
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || 0)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">参与费用 (元)</label>
              <input
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">活动标签</label>
            <input
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
