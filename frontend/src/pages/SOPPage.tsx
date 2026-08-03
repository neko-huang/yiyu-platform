import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client, {
  getSOPTemplates,
  createSOPTemplate,
  deleteSOPTemplate,
  useSOPTemplate,
} from '../api/client';
import type { SOPTemplate, SOPTemplateCreateRequest } from '../types';
import { createCategories } from '../utils/constants';

type ViewMode = 'list' | 'detail' | 'create';

// 模拟模板数据
const mockTemplates: SOPTemplate[] = [
  {
    id: 1, user_id: 1, name: '户外徒步活动 SOP', category: '户外',
    description: '适用于 20-50 人的户外徒步活动标准流程模板',
    content: '# 户外徒步活动 SOP\n\n## 活动概述\n- 适用场景：周末短途徒步、城市周边登山\n- 预期规模：20-50 人\n- 活动时长：6-8 小时\n\n## 筹备阶段\n1. 路线规划（活动前 3 周）：确认路线难度、长度、补给点\n2. 场地踩点（活动前 2 周）：实地走一遍路线\n3. 人员分工（活动前 2 周）：领队、收尾、摄影、后勤\n4. 报名开启（活动前 2 周）：发布活动、设置报名链接\n5. 物料采购（活动前 1 周）：急救包、对讲机、补给品\n\n## 活动当天\n- 07:30 集合签到\n- 08:00 热身 & 安全须知\n- 08:30 出发\n- 12:00 午餐休息\n- 16:00 返回终点\n- 16:30 合影 & 解散\n\n## 物料清单\n| 物料 | 数量 | 预算 |\n|------|------|------|\n| 急救包 | 2 | ¥100 |\n| 对讲机 | 4 | ¥200(租赁) |\n| 矿泉水 | 100瓶 | ¥150 |\n| 能量棒 | 60根 | ¥180 |',
    tags: ['徒步', '户外', '登山'], source_event_id: null,
    is_public: true, is_active: true, usage_count: 12,
    created_at: '2026-07-15T10:00:00', updated_at: '2026-07-15T10:00:00',
  },
  {
    id: 2, user_id: 1, name: '读书分享会 SOP', category: '读书',
    description: '适用于 10-30 人的读书会标准流程',
    content: '# 读书分享会 SOP\n\n## 活动概述\n- 适用场景：定期读书会、主题阅读分享\n- 预期规模：10-30 人\n- 活动时长：2-3 小时\n\n## 筹备阶段\n1. 选定书目（活动前 3 周）\n2. 预定场地（活动前 2 周）\n3. 发布活动（活动前 2 周）\n4. 准备讨论提纲（活动前 1 周）\n\n## 活动流程\n- 14:00 签到 & 茶歇\n- 14:15 主持人开场\n- 14:30 嘉宾分享\n- 15:30 自由讨论\n- 16:30 总结 & 下期预告',
    tags: ['读书', '分享'], source_event_id: null,
    is_public: true, is_active: true, usage_count: 8,
    created_at: '2026-07-20T14:00:00', updated_at: '2026-07-20T14:00:00',
  },
  {
    id: 3, user_id: 1, name: '线下工作坊 SOP', category: '艺术',
    description: '适用于手工、绘画等创意类工作坊',
    content: '# 创意工作坊 SOP\n\n## 活动概述\n- 适用场景：手工DIY、绘画、书法等\n- 预期规模：10-20 人\n- 活动时长：3-4 小时\n\n## 筹备阶段\n1. 确定主题 & 讲师（活动前 3 周）\n2. 物料采购（活动前 2 周）\n3. 报名发布（活动前 2 周）\n4. 场地布置方案（活动前 1 周）\n\n## 活动流程\n- 09:30 签到 & 领取材料包\n- 10:00 讲师介绍 & 示范\n- 10:30 学员动手制作\n- 12:00 作品展示 & 点评\n- 12:30 合影 & 结束',
    tags: ['手工', '工作坊', '艺术'], source_event_id: null,
    is_public: true, is_active: true, usage_count: 5,
    created_at: '2026-07-25T09:00:00', updated_at: '2026-07-25T09:00:00',
  },
];

export default function SOPPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<SOPTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<SOPTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Create form
  const [form, setForm] = useState<SOPTemplateCreateRequest>({
    name: '', category: '通用', description: '', content: '', tags: [], is_public: false,
  });
  const [tagInput, setTagInput] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (categoryFilter) params.category = categoryFilter;
      if (keyword) params.keyword = keyword;
      const res = await getSOPTemplates(params);
      setTemplates(res.items);
    } catch {
      setTemplates(mockTemplates);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, keyword]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreateLoading(true);
    try {
      const newTemplate = await createSOPTemplate(form);
      setTemplates([newTemplate, ...templates]);
      setForm({ name: '', category: '通用', description: '', content: '', tags: [], is_public: false });
      setView('list');
    } catch {
      // 模拟创建
      const mock: SOPTemplate = {
        id: Date.now(), user_id: 1, name: form.name, category: form.category,
        description: form.description || null, content: form.content || null,
        tags: form.tags || [], source_event_id: null,
        is_public: form.is_public || false, is_active: true, usage_count: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setTemplates([mock, ...templates]);
      setView('list');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm('确定删除此模板？')) return;
    try {
      await deleteSOPTemplate(templateId);
    } catch { /* ignore */ }
    setTemplates(templates.filter(t => t.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
      setView('list');
    }
  };

  const handleUse = async (template: SOPTemplate) => {
    try {
      await useSOPTemplate(template.id);
    } catch { /* ignore */ }
    setTemplates(templates.map(t =>
      t.id === template.id ? { ...t, usage_count: t.usage_count + 1 } : t
    ));
  };

  const handleViewDetail = (template: SOPTemplate) => {
    setSelectedTemplate(template);
    setView('detail');
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      setForm({ ...form, tags: [...(form.tags || []), tag] });
      setTagInput('');
    }
  };

  const categories = ['通用', ...createCategories.filter(c => c !== '其他')];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOP 模板中心</h1>
          <p className="text-gray-500 text-sm mt-1">标准化管理活动流程，让每次活动都有章可循</p>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('create')} className="btn-primary">
            + 新建模板
          </button>
        )}
        {(view === 'detail' || view === 'create') && (
          <button onClick={() => setView('list')} className="btn-secondary">
            ← 返回列表
          </button>
        )}
      </div>

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索模板..."
              className="input-field w-48"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field w-32"
            >
              <option value="">全部分类</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewDetail(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{template.name}</h3>
                    <span className="tag bg-primary-100 text-primary-700 text-xs flex-shrink-0 ml-2">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {template.description || '暂无描述'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex gap-1 flex-wrap">
                      {(template.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span>已使用 {template.usage_count} 次</span>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📋</p>
                  <p>暂无模板，点击上方按钮创建第一个 SOP 模板</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail view */}
      {view === 'detail' && selectedTemplate && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="tag bg-primary-100 text-primary-700">{selectedTemplate.category}</span>
                  <span>已使用 {selectedTemplate.usage_count} 次</span>
                  <span>{new Date(selectedTemplate.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUse(selectedTemplate)}
                  className="btn-primary text-sm"
                >
                  📋 使用此模板
                </button>
                <button
                  onClick={() => handleDelete(selectedTemplate.id)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  删除
                </button>
              </div>
            </div>
            {selectedTemplate.description && (
              <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
            )}
            <div className="flex gap-1 flex-wrap mb-4">
              {(selectedTemplate.tags || []).map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">模板内容</h3>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              {(selectedTemplate.content || '暂无内容').split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-2">{line.replace('# ', '')}</h2>;
                if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-semibold text-gray-800 mt-3 mb-2">{line.replace('## ', '')}</h3>;
                if (line.startsWith('### ')) return <h4 key={i} className="text-base font-semibold text-gray-800 mt-2 mb-1">{line.replace('### ', '')}</h4>;
                if (line.startsWith('- ')) return <li key={i} className="ml-4">{line.replace('- ', '')}</li>;
                if (line.startsWith('| ')) return <p key={i} className="font-mono text-xs bg-gray-50 px-2 py-0.5">{line}</p>;
                if (line.trim()) return <p key={i} className="mb-1">{line}</p>;
                return <br key={i} />;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create view */}
      {view === 'create' && (
        <div className="card p-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">创建 SOP 模板</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模板名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="如：周末读书会标准流程"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-field"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_public || false}
                    onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">公开模板（其他用户可见）</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
                placeholder="简要描述此模板的适用场景..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  className="input-field flex-1"
                  placeholder="输入标签后按回车"
                />
                <button type="button" onClick={addTag} className="btn-secondary text-sm">添加</button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(form.tags || []).map(tag => (
                  <span
                    key={tag}
                    className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tags: form.tags!.filter(t => t !== tag) })}
                      className="text-primary-400 hover:text-primary-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模板内容 (Markdown)</label>
              <textarea
                value={form.content || ''}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="input-field font-mono text-sm"
                rows={15}
                placeholder="# 活动名称 SOP&#10;&#10;## 活动概述&#10;...&#10;&#10;## 筹备阶段&#10;1. ...&#10;2. ...&#10;&#10;## 活动当天&#10;- 09:00 ...&#10;&#10;## 物料清单&#10;| 物料 | 数量 | 预算 |&#10;|------|------|------|"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createLoading} className="btn-primary disabled:opacity-50">
                {createLoading ? '创建中...' : '创建模板'}
              </button>
              <button type="button" onClick={() => setView('list')} className="btn-secondary">
                取消
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
