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
  const [city, setCity] = useState(() => localStorage.getItem('aiPlanCity') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载用户画像获取城市信息（仅当 localStorage 没有时）
  useEffect(() => {
    if (user?.id && !localStorage.getItem('aiPlanCity')) {
      client.get('/profiles/me').then((res) => {
        if (res.data?.location) {
          setCity(res.data.location);
          localStorage.setItem('aiPlanCity', res.data.location);
        }
      }).catch(() => {});
    }
  }, [user?.id]);

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
    if (city) localStorage.setItem('aiPlanCity', city);
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
      // 传递 API Key、Base URL 和城市信息给后端
      const payload: Record<string, string> = { prompt: userMessage };
      if (apiKey) payload.api_key = apiKey;
      if (baseUrl) payload.base_url = baseUrl;
      if (city) payload.city = city;

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
      {/* Header + Settings — 固定顶部不随滚动消失 */}
      <div className="sticky top-0 z-10 bg-white">
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
              <div className="flex-1">
                <label className="block text-xs font-medium text-amber-700 mb-1">所在城市</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field text-sm"
                  placeholder="如：上海、北京"
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
  const hasPet = /猫|狗|宠物|萌宠|动物|撸猫|吸猫/.test(prompt);
  const hasPetShelter = /搭棚|窝|棚子|猫舍|救助/.test(prompt);
  const hasOutdoor = /户外|徒步|登山|露营|爬山/.test(prompt);
  const hasMusic = /音乐|演出|演唱会|乐队/.test(prompt);
  const hasRead = /读书|阅读|分享会|书/.test(prompt);
  const hasSport = /运动|马拉松|跑步|比赛|健身/.test(prompt);
  const hasDIY = /手工|DIY|手作|制作|编织|陶艺/.test(prompt);

  if (hasPetShelter) {
    return `# 🐱 猫咪爱心小屋搭建活动

## 活动概述
**活动名称**：猫咪爱心小屋搭建行动
**主题**：为流浪猫搭建温暖避风棚，传递城市温度
**目标受众**：爱猫人士、宠物志愿者、家庭亲子
**预期规模**：15-25人
**核心价值**：实际动手为流浪猫改善生存环境，结合动物福利教育

## 推荐场地
| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |
|----------|----------|----------|----------|
| 宠物救助站/流浪猫收容所 | 现场有真实需求，可实地搭建 | 20-30人 | 免费或¥200捐赠 |
| 社区闲置空间/共享庭院 | 就近搭建，方便社区猫群使用 | 15-20人 | 免费（需社区报备） |
| 宠物友好型文创园区 | 园区空地搭建，配套工具齐全 | 25-30人 | ¥300-500 |
| 城市近郊农庄/院落 | 空间大，适合搭建多组棚子 | 20-30人 | ¥500-800 |

## 流程时间表
| 时间 | 环节 | 内容 | 负责人 |
|------|------|------|--------|
| 09:00-09:30 | 签到集合 | 签到、分发材料包、安全须知 | 组织者 |
| 09:30-10:00 | 设计讲解 | 展示猫窝设计图、材料介绍 | 设计师 |
| 10:00-11:30 | 动手搭建 | 分组搭建猫窝/猫棚 | 各组组长 |
| 11:30-12:00 | 装饰美化 | 防水处理、保暖填充、装饰 | 全员 |
| 12:00-13:00 | 午餐交流 | 分享养猫故事、动物福利讨论 | — |
| 13:00-14:00 | 实地安置 | 将猫窝放置到选定位置 | 全员 |
| 14:00-14:30 | 合影留念 | 成果展示、合影 | 摄影师 |

## 预算估算
| 项目 | 类别 | 金额 | 备注 |
|------|------|------|------|
| 木材/板材 | 物料 | ¥300-500 | 防腐木，防雨耐用 |
| 保温材料 | 物料 | ¥100-200 | 泡沫板、旧毛毯 |
| 防水布/漆 | 物料 | ¥80-150 | 户外防水涂层 |
| 工具租用 | 物料 | ¥100-200 | 锯子、钉子、胶枪等 |
| 猫粮/零食 | 其他 | ¥100 | 用于吸引猫咪 |
| 午餐/饮水 | 其他 | ¥200-300 | 工作人员简餐 |
| **合计** | | **¥880-1,450** | |

## 任务清单
### 前期准备
- [ ] 确认场地和日期
- [ ] 采购建材和工具
- [ ] 设计猫窝图纸（防风防雨保暖）
- [ ] 招募参与者（建议有木工经验者优先）
- [ ] 购买保险

### 活动当天
- [ ] 提前到场布置工具区
- [ ] 分组并分配任务
- [ ] 安全监督（尤其电钻等工具使用）
- [ ] 现场拍照记录

### 后期跟进
- [ ] 定期回访猫窝使用情况
- [ ] 维修加固

## 风险预案
| 风险 | 影响 | 应对方案 | 负责人 |
|------|------|----------|--------|
| 天气变化 | 高 | 准备室内备用场地/雨棚 | 组织者 |
| 工具受伤 | 中 | 配备急救包，安全员巡查 | 安全员 |
| 材料不足 | 中 | 多备20%余量 | 采购 |
| 流浪猫应激 | 低 | 请救助站人员指导安置 | 救助站 |

> 💡 **提示**：您可以继续对话来调整方案细节，或点击「转化为活动」直接创建活动。`;
  }

  if (hasPet) {
    return `# 🐱 猫咪主题互动体验活动

## 活动概述
**活动名称**：猫咪主题互动体验日
**主题**：与猫共处、了解猫咪行为、领养代替购买
**目标受众**：爱猫人士、想养猫的潜在领养者、亲子家庭
**预期规模**：20-35人
**核心价值**：在专业指导下安全地与猫咪互动，传播科学养宠知识

## 推荐场地
| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |
|----------|----------|----------|----------|
| 猫主题咖啡馆 | 专业猫咖，猫咪温顺，环境舒适 | 15-25人 | ¥1,000-2,000包场 |
| 宠物救助站互动区 | 可领养猫咪，公益性质 | 20-30人 | 免费或¥500捐赠 |
| 室内萌宠互动馆 | 专业设施，有工作人员指导 | 20-30人 | ¥800-1,500 |
| 宠物友好书店/空间 | 安静氛围，适合猫咪知识分享 | 15-20人 | ¥500-1,000 |

## 流程时间表
| 时间 | 环节 | 内容 | 负责人 |
|------|------|------|--------|
| 10:00-10:30 | 签到+消毒 | 签到、手部消毒、换鞋套、安全须知 | 接待 |
| 10:30-11:00 | 猫咪知识小课堂 | 猫咪行为解读、互动注意事项 | 讲师 |
| 11:00-11:30 | 自由互动 | 在工作人员指导下与猫咪互动 | 全员 |
| 11:30-12:00 | 猫咪玩具DIY | 用简单材料制作逗猫棒 | 手工导师 |
| 12:00-13:00 | 午餐休息 | 与猫咪共处 | — |
| 13:00-14:00 | 领养分享会 | 救助站分享领养故事和流程 | 救助站 |
| 14:00-14:30 | 自由互动+合影 | 最后互动时间、合影留念 | 摄影师 |

## 预算估算
| 项目 | 类别 | 金额 | 备注 |
|------|------|------|------|
| 场地费 | 场地 | ¥800-2,000 | 猫咖/萌宠馆包场 |
| 猫咪零食 | 物料 | ¥200-300 | 互动奖励用 |
| 手工材料 | 物料 | ¥100-200 | 逗猫棒材料包 |
| 茶歇 | 餐饮 | ¥300-500 | 饮品+小食 |
| 宣传物料 | 其他 | ¥100-200 | 海报、手册 |
| **合计** | | **¥1,500-3,200** | |

## 任务清单
### 前期准备
- [ ] 预定场地（确认猫咪数量和人猫比例）
- [ ] 准备消毒用品
- [ ] 采购手工材料
- [ ] 邀请救助站分享嘉宾
- [ ] 发布活动报名

### 活动当天
- [ ] 场地消毒和布置
- [ ] 控制互动节奏，避免猫咪应激
- [ ] 拍摄照片和视频

## 风险预案
| 风险 | 影响 | 应对方案 | 负责人 |
|------|------|----------|--------|
| 猫咪抓伤 | 中 | 配备碘伏创可贴，事前提醒互动规范 | 安全员 |
| 猫咪应激 | 中 | 设置安静退避区，不强迫互动 | 工作人员 |
| 参与者过敏 | 中 | 报名时提醒过敏风险，备抗过敏药 | 组织者 |

> 💡 **提示**：您可以继续对话来调整方案细节，或点击「转化为活动」直接创建活动。`;
  }

  if (hasDIY) {
    return `# ✂️ 创意手工DIY工作坊

## 活动概述
**活动名称**：创意手工DIY工作坊
**主题**：亲手制作，体验手作乐趣
**目标受众**：手工爱好者、亲子家庭、文艺青年
**预期规模**：15-25人
**核心价值**：在导师指导下完成一件手作作品，放松身心

## 推荐场地
| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |
|----------|----------|----------|----------|
| 手作工坊/工作室 | 工具齐全，有专业导师 | 10-20人 | ¥1,000-2,000 |
| 文创园区共享空间 | 氛围好，配套齐全 | 20-30人 | ¥500-1,000 |
| 书店活动区 | 安静舒适 | 15-20人 | ¥300-800 |

## 预算估算
| 项目 | 金额 | 说明 |
|------|------|------|
| 材料包 | ¥500-800 | 每人一份材料包 |
| 场地费 | ¥500-1,500 | 按场地类型 |
| 导师费 | ¥500-1,000 | 专业手作导师 |
| **合计** | **¥1,500-3,300** | |

> 💡 **提示**：您可以继续对话来调整方案细节，或点击「转化为活动」直接创建活动。`;
  }

  const category = hasOutdoor ? '户外' : hasMusic ? '音乐' : hasRead ? '读书' : hasSport ? '运动' : '综合';
  const title = hasOutdoor ? '周末户外探索之旅' : hasMusic ? '城市音乐盛典' : hasRead ? '书香伴我行读书会' : hasSport ? '活力运动嘉年华' : '精彩活动策划方案';

  return `# ${title}

## 活动概述
基于您的需求"${prompt}"，以下是完整的活动策划方案：

## 推荐场地
${hasOutdoor
  ? '| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |\n|----------|----------|----------|----------|\n| 城市近郊森林公园 | 自然步道、空气清新，适合徒步 | 20-50人 | 免费-¥30/人 |\n| 户外拓展基地 | 专业设施，有教练指导 | 30-50人 | ¥1,000-2,000 |\n| 城市公园草坪区 | 交通便利，适合轻量户外 | 20-30人 | 免费（需预约） |'
  : hasMusic
  ? '| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |\n|----------|----------|----------|----------|\n| Livehouse | 专业音响灯光设备 | 100-300人 | ¥3,000-8,000 |\n| 音乐厅/剧场 | 声场效果佳，适合正式演出 | 200-500人 | ¥5,000-15,000 |\n| 露天广场/公园 | 免费开放，氛围轻松 | 500+人 | 免费-¥2,000 |'
  : hasRead
  ? '| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |\n|----------|----------|----------|----------|\n| 独立书店活动区 | 书香氛围浓厚 | 15-30人 | ¥500-1,000 |\n| 图书馆多功能厅 | 安静专业，设备齐全 | 30-50人 | 免费-¥500 |\n| 社区活动室 | 就近方便，成本低 | 15-20人 | 免费-¥200 |'
  : hasSport
  ? '| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |\n|----------|----------|----------|----------|\n| 体育场馆/运动中心 | 专业场地和设备 | 50-100人 | ¥2,000-5,000 |\n| 城市公园跑道/广场 | 开放空间，适合大众参与 | 100+人 | 免费 |\n| 健身房/运动工作室 | 专业教练指导 | 20-30人 | ¥1,000-3,000 |'
  : '| 场地类型 | 适合原因 | 容纳人数 | 预估费用 |\n|----------|----------|----------|----------|\n| 创意园区共享空间 | 氛围好、配套齐全 | 20-40人 | ¥500-1,500 |\n| 社区活动中心 | 成本低、交通便利 | 15-30人 | 免费-¥300 |\n| 咖啡厅/书店活动区 | 轻松氛围，适合社交 | 15-25人 | ¥300-800 |'}

## 流程时间表
| 时间 | 环节 | 内容 |
|------|------|------|
| 签到集合 | 活动开始前30分钟 | 签到、领取物资 |
| 开场介绍 | 前30分钟 | 活动介绍、安全须知 |
| 主体活动 | 2-3小时 | 核心活动环节 |
| 休息交流 | 中间30分钟 | 自由交流、茶歇 |
| 总结分享 | 最后30分钟 | 活动总结、合影留念 |

## 预算估算
| 项目 | 金额 | 说明 |
|------|------|------|
| 场地费 | ¥500-3,000 | 按场地类型 |
| 物资采购 | ¥300-800 | 活动所需物料 |
| 人员费用 | ¥500-1,000 | 工作人员/导师 |
| 宣传推广 | ¥200-500 | 海报、推广 |
| **合计** | **¥1,500-5,300** | |

## 风险预案
| 风险 | 影响 | 应对方案 |
|------|------|----------|
| 人数不足 | 中 | 设置最低开团人数，不足延期 |
| 安全问题 | 高 | 购买活动保险，配备急救包 |
| 天气变化 | 中 | 准备备用室内方案 |

> 💡 **提示**：您可以继续对话来调整方案细节，或点击「转化为活动」直接创建活动。`;
}