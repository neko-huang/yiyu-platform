import { useState, useRef, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const API_KEY_STORAGE_KEY = 'deepseekApiKey';
const BASE_URL_STORAGE_KEY = 'deepseekBaseUrl';

const examplePrompts = [
  '帮我策划一个周末户外徒步活动，适合20-30人参加',
  '我想要组织一场公司团建，100人左右，预算每人200元',
  '策划一个读书分享会，主题是科幻文学',
  '帮我设计一个夏日音乐节活动方案',
];

function getStorageKey(userId: number | null): string {
  return userId ? `aiPlanMessages_${userId}` : 'aiPlanMessages_guest';
}

function loadMessages(userId: number | null): ChatMessage[] {
  const key = getStorageKey(userId);
  try {
    // 迁移旧数据：如果用户有 ID 且旧 key 存在，迁移到新 key
    if (userId) {
      const oldData = localStorage.getItem('aiPlanMessages');
      const newData = localStorage.getItem(key);
      if (oldData && !newData) {
        localStorage.setItem(key, oldData);
        localStorage.removeItem('aiPlanMessages');
      }
    }
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveMessages(messages: ChatMessage[], userId: number | null) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(messages));
  } catch {}
}

export default function AIPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadMessages(userId);
    if (saved.length > 0) return saved;
    return [{
      role: 'assistant',
      content: '你好！我是益屿AI活动策划助手 ✨\n\n告诉我你想举办什么样的活动，我将为你生成完整的活动方案。你可以描述：\n- 活动类型（户外、音乐、读书、运动等）\n- 预期人数\n- 预算范围\n- 特殊需求\n\n例如：「帮我策划一个周末户外徒步活动，适合20-30人参加」',
    }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem(BASE_URL_STORAGE_KEY) || 'https://api.deepseek.com');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 消息变化时持久化
  useEffect(() => {
    saveMessages(messages, userId);
  }, [messages, userId]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const saveApiSettings = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
    setShowSettings(false);
    setErrorMsg('API 设置已保存');
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const clearChat = () => {
    localStorage.removeItem(getStorageKey(userId));
    setMessages([{
      role: 'assistant',
      content: '你好！我是益屿AI活动策划助手 ✨\n\n告诉我你想举办什么样的活动，我将为你生成完整的活动方案。',
    }]);
    setCurrentPlan('');
  };

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setErrorMsg('');

    try {
      // 传递 API Key 和 Base URL 给后端
      const payload: Record<string, string> = { prompt: userMessage };
      if (apiKey) payload.api_key = apiKey;
      if (baseUrl) payload.base_url = baseUrl;

      const res = await client.post('/ai/plan/generate', payload);
      const planContent = res.data.content || '抱歉，我暂时无法生成方案，请稍后重试。';
      const newMessages = [...updatedMessages, { role: 'assistant' as const, content: planContent }];
      setMessages(newMessages);
      setCurrentPlan(planContent);
    } catch (err) {
      const isNetworkErr = err instanceof Error && !('response' in err && (err as { response?: unknown }).response);
      const is404 = (err as { response?: { status: number } })?.response?.status === 404;
      
      if (isNetworkErr || is404) {
        // 后端不可达或端点不存在 → 模拟
        const mockPlan = generateMockPlan(userMessage);
        timeoutRef.current = setTimeout(() => {
          const newMessages = [...updatedMessages, { role: 'assistant' as const, content: mockPlan }];
          setMessages(newMessages);
          setCurrentPlan(mockPlan);
          timeoutRef.current = null;
        }, 1500);
      } else {
        const errMsg = getErrorMessage(err, 'AI 服务暂时不可用');
        setErrorMsg(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = () => {
    if (!currentPlan) return;
    const savedPlans = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    savedPlans.push({ content: currentPlan, saved_at: new Date().toISOString() });
    localStorage.setItem('savedPlans', JSON.stringify(savedPlans));
    setErrorMsg('方案已保存！');
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const handleConvertToEvent = () => {
    if (!currentPlan) return;
    sessionStorage.setItem('aiPlanContent', currentPlan);
    navigate('/events/create');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">✨</span>
              AI 活动策划助手
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">智能生成专业活动方案，让策划变得简单</p>
          </div>
          <div className="flex gap-2 items-center">
            {errorMsg && (
              <span className={`text-sm ${errorMsg.includes('已保存') || errorMsg.includes('已设置') ? 'text-green-600' : 'text-red-500'}`}>
                {errorMsg}
              </span>
            )}
            <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary text-sm">
              ⚙️ 设置
            </button>
            <button onClick={clearChat} className="btn-secondary text-sm">
              🗑️ 清空对话
            </button>
            <button onClick={handleSavePlan} disabled={!currentPlan} className="btn-secondary text-sm">
              💾 保存方案
            </button>
            <button onClick={handleConvertToEvent} disabled={!currentPlan} className="btn-primary text-sm">
              📋 转化为活动
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-sm font-semibold text-amber-800 mb-3">⚙️ DeepSeek API 配置</h3>
            <p className="text-xs text-amber-600 mb-3">
              配置你自己的 DeepSeek API Key，AI 策划将使用你的额度生成真实方案。留空则使用模拟数据。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-amber-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-field text-sm"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-amber-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="input-field text-sm"
                  placeholder="https://api.deepseek.com"
                />
              </div>
              <div className="flex items-end">
                <button onClick={saveApiSettings} className="btn-primary text-sm px-4">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4" aria-live="polite">
            <div className="max-w-3xl mx-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1" aria-hidden="true">
                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-400">AI 正在思考...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Example prompts (only show when no user messages) */}
          {messages.filter(m => m.role === 'user').length === 0 && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <p className="text-xs text-gray-400 mb-2">💡 试试这些示例：</p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-4 py-4">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="input-field flex-1"
                placeholder="描述你想要的活动..."
                disabled={loading}
                aria-label="输入活动描述"
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-6">
                发送
              </button>
            </form>
          </div>
        </div>

        {/* Plan preview sidebar */}
        <div className="w-96 border-l border-gray-200 bg-gray-50 hidden xl:flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h2 className="font-semibold text-gray-900 text-sm">📄 方案预览</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {currentPlan ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{currentPlan}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-gray-400 mt-12">
                <div className="text-4xl mb-3" aria-hidden="true">📝</div>
                <p className="text-sm">与 AI 对话后，生成的方案将显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 模拟 AI 生成的方案（后端不可用时兜底）
function generateMockPlan(prompt: string): string {
  const hasOutdoor = /户外|徒步|登山|露营/.test(prompt);
  const hasMusic = /音乐|演出|演唱会/.test(prompt);
  const hasRead = /读书|阅读|分享会/.test(prompt);
  const hasSport = /运动|马拉松|跑步|比赛/.test(prompt);

  const category = hasOutdoor ? '户外' : hasMusic ? '音乐' : hasRead ? '读书' : hasSport ? '运动' : '综合';
  const title = hasOutdoor ? '周末户外探索之旅' : hasMusic ? '城市音乐盛典' : hasRead ? '书香伴我行读书会' : hasSport ? '活力运动嘉年华' : '精彩活动策划方案';

  return `# ${title}

## 📋 活动概述
基于您的需求"${prompt}"，以下是完整的活动策划方案：

## 🎯 活动目标
- 提供${category}领域的深度体验
- 促进参与者之间的交流与互动
- 打造高质量的社群活动品牌

## 📅 活动安排

### 时间规划
| 环节 | 时间 | 内容 |
|------|------|------|
| 签到集合 | 09:00-09:30 | 签到、领取物资 |
| 开场介绍 | 09:30-10:00 | 活动介绍、安全须知 |
| 主体活动 | 10:00-12:00 | 核心活动环节 |
| 午餐休息 | 12:00-13:30 | 自由交流、用餐 |
| 下午环节 | 13:30-16:00 ${hasOutdoor ? '（继续行程）' : '（互动游戏）'} |
| 总结分享 | 16:00-16:30 | 活动总结、合影留念 |

### 地点建议
${hasOutdoor ? '- 推荐地点：城市近郊自然景区\n- 需提前勘察路线，确保安全\n- 准备备用室内方案' : '- 推荐地点：市中心文化空间/创意园区\n- 交通便利，配套设施完善\n- 预计容纳30-50人'}

## 💰 预算方案

### 收入预估
- 报名费：¥50-100/人 × 30人 = ¥1,500-3,000
- 赞助合作：¥500-1,000

### 支出预算
| 项目 | 预估金额 | 说明 |
|------|----------|------|
| 场地费 | ¥500-1,000 | ${hasOutdoor ? '景区门票' : '场地租赁'} |
| 物资采购 | ¥300-500 | ${hasOutdoor ? '急救包、补给品' : '茶歇、物料'} |
| 人员费用 | ¥500-800 | 工作人员补贴 |
| 宣传推广 | ¥200-300 | 海报设计、社交媒体推广 |
| **合计** | **¥1,500-2,600** | |

## 👥 人员配置
- 活动总负责人 × 1
- 现场协调员 × 2
- 摄影/记录 × 1
- ${hasOutdoor ? '安全领队 × 2（需持证）' : '后勤保障 × 1'}

## 📣 宣传推广
1. **社交媒体**：微信公众号推文、小红书种草笔记
2. **社群推广**：相关兴趣群组转发
3. **海报设计**：线上+线下双渠道
4. **口碑裂变**：老带新优惠机制

## ⚠️ 风险预案
- ${hasOutdoor ? '天气突变：准备雨具和备用室内方案' : '人数不足：设置最低开团人数，不足延期'}
- 参与者安全：购买活动保险
- 突发事件：制定应急预案，配备急救包

## ✅ 检查清单
- [ ] 确定活动日期和场地
- [ ] 采购所需物资
- [ ] 发布活动报名
- [ ] 联系工作人员
- [ ] 准备应急预案
- [ ] 活动前1天发送提醒通知

---

> 💡 **提示**：您可以继续对话来调整方案细节，或点击「转化为活动」直接创建活动。`;
}