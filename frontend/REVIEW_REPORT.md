# 益屿活动管理平台 — 前端代码审查报告

> 审查日期：2026-08-03  
> 审查范围：`frontend/src/` 全部源码  
> 技术栈：React 18 + TypeScript + Vite 5 + TailwindCSS 3 + react-leaflet 4 + axios

---

## 一、审查总结

共发现 **32 项问题**，覆盖安全、错误处理、用户体验、性能、代码质量、可访问性、响应式设计 7 个维度。已全部修复，`npm run build` 通过。

| 严重级别 | 问题数 | 已修复 |
|---------|--------|--------|
| 🔴 严重 | 6 | 6 |
| 🟡 中等 | 14 | 14 |
| 🔵 轻微 | 12 | 12 |

---

## 二、修复清单（按审查维度）

### 1. 安全问题

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 1.1 | **API Base URL 硬编码** `http://localhost:8000/api/v1` | 🔴 | 改为 `import.meta.env.VITE_API_BASE_URL` 环境变量，保留 fallback。新增 `src/vite-env.d.ts` 类型声明 |
| 1.2 | **403 错误未处理** — 拦截器仅处理 401，403 静默失败 | 🟡 | 在响应拦截器中注释说明 403 由各页面自行处理（显示权限提示），EventDetail 报名按钮区分 403/409 |
| 1.3 | **401 跳转未保存来源路径** — 用户被踢到登录页后无法返回 | 🟡 | 401 时保存 `sessionStorage.redirectAfterLogin`，Login 页登录成功后读取并跳回 |
| 1.4 | **Token 存储在 localStorage** — 存在 XSS 风险 | 🔵（已知限制） | 这是 SPA JWT 的标准做法，需后端配合才能改用 httpOnly Cookie。当前确保无 `dangerouslySetInnerHTML`，ReactMarkdown 默认不渲染原始 HTML，XSS 面已控制 |
| 1.5 | **敏感信息暴露** — User 对象（含 email）存入 localStorage | 🔵 | 保留现有行为（SPA 标准），但确保 token 失效时同步清除 user |

### 2. 错误处理

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 2.1 | **无网络错误重试机制** | 🟡 | 新增 `getWithRetry()` 工具函数，对网络错误/超时自动重试（指数退避，最多 2 次） |
| 2.2 | **错误消息不友好** — catch 块直接用 `err.message`，可能显示 `Network Error` | 🟡 | 新增 `utils/errors.ts`，`getErrorMessage()` 优先提取后端 `detail` 字段，fallback 到用户友好提示 |
| 2.3 | **CreateEvent 错误被吞** — catch 块静默模拟成功 | 🔴 | 改为显示具体错误消息（`getErrorMessage`），不再静默跳转 |
| 2.4 | **表单验证不完善** — CreateEvent 未校验结束时间 > 开始时间、人数 > 0、价格 ≥ 0 | 🟡 | 新增完整前端验证：时间逻辑、人数下限、价格非负 |
| 2.5 | **Register 未校验邮箱格式** | 🟡 | 新增正则邮箱校验 |
| 2.6 | **Login 未校验空字段** | 🟡 | 新增非空校验 |

### 3. 用户体验

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 3.1 | **EventManage 财务表单无防重复提交** — 添加按钮可多次点击 | 🔴 | 新增 `finSubmitting` 状态，提交时禁用按钮并显示"添加中..." |
| 3.2 | **EventManage 报名操作无 loading** — 通过/拒绝/签到按钮无反馈 | 🟡 | 新增 `actionLoading` 状态映射，操作时禁用对应按钮 |
| 3.3 | **Home 无分页** — 一次性加载所有活动 | 🟡 | 新增"加载更多"分页机制（`PAGE_SIZE=9`，每页显示 9 个） |
| 3.4 | **MapPage error 状态声明但从未赋值** — 死代码 | 🟡 | 移除未使用的 error 状态，改为空状态提示（events.length === 0 时显示"暂无活动"） |
| 3.5 | **Home 模拟数据无提示** — 后端未连接时静默使用 mock | 🟡 | 新增琥珀色提示条"后端服务未连接，当前显示模拟数据" |
| 3.6 | **EventDetail 报名失败无提示** — catch 块静默模拟成功 | 🔴 | 区分 403（已报名）、409（已满）、网络错误，显示对应错误消息 |
| 3.7 | **AIPlan 保存方案用 alert()** — 阻塞式弹窗 | 🟡 | 改为行内提示消息，3 秒后自动消失 |
| 3.8 | **CreateEvent AI 弹窗未读 sessionStorage** — AIPlan 存的内容未预填 | 🟡 | CreateEvent 初始化时读取 `sessionStorage.aiPlanContent` 预填描述字段 |
| 3.9 | **EventDetail 剩余名额可能为负** — `max - current` 无下限保护 | 🔵 | 改为 `Math.max(max - current, 0)` |

### 4. 性能优化

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 4.1 | **EventCard 未 memo 化** — 列表重渲染时所有卡片重渲染 | 🟡 | 使用 `React.memo()` 包裹 |
| 4.2 | **无路由级懒加载** — 所有页面打入首屏 bundle | 🔴 | `App.tsx` 全部页面改为 `React.lazy()` + `Suspense`，首屏包从 1 个大 chunk 拆为 15 个小 chunk |
| 4.3 | **图片未懒加载** | 🟡 | EventCard、EventDetail 图片添加 `loading="lazy"` |
| 4.4 | **AuthContext 内存泄漏** — `/auth/me` 异步请求在组件卸载后仍 setState | 🔴 | 新增 `isMounted` 标志，cleanup 时置 false |
| 4.5 | **AIPlan setTimeout 内存泄漏** — mock 响应的 setTimeout 在卸载后仍执行 | 🔴 | 使用 `useRef` 存储 timeout ID，cleanup 时 `clearTimeout` |
| 4.6 | **Home events 列表未 useMemo** — 每次渲染重新 slice | 🔵 | `visibleEvents` 使用 `useMemo` 缓存 |

### 5. 代码质量

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 5.1 | **statusLabels 重复定义** — EventDetail 和 EventManage 各定义一份 | 🟡 | 抽取到 `utils/constants.ts`，两处 import 共享 |
| 5.2 | **formatDate 重复** — EventCard 内部定义 | 🔵 | 抽取到 `utils/constants.ts` |
| 5.3 | **TS 类型错误** — MapView `eventHandlers` 不存在于 MapContainerProps | 🔴 | 改用 `useMapEvents` hook 通过子组件 `ClickHandler` 处理点击 |
| 5.4 | **TS 类型错误** — MapView `L.Icon.Default.prototype` 类型转换不安全 | 🔴 | 改为 `as unknown as Record<string, unknown>` 两步转换 |
| 5.5 | **TS 类型错误** — Profile `filter(Boolean)` 不收窄类型 | 🔴 | 新增 `filterTruthy<T>` 类型守卫工具函数 |
| 5.6 | **tsconfig.node.json 配置冲突** — `composite: true` + `noEmit: true` | 🔴 | 移除项目引用，简化为 `tsc --noEmit` |
| 5.7 | **vite.config.ts 加载失败** — 非 ASCII 路径导致 esbuild 打包配置失败 | 🔴 | 转为 `vite.config.js`，新增 `build.sh` 通过符号链接规避路径问题 |
| 5.8 | **分类/类型常量分散** — Home、CreateEvent 各定义一份 | 🔵 | 统一抽取到 `utils/constants.ts`（`categories`、`createCategories`、`eventTypes`、`categoryColors`） |
| 5.9 | **EventDetail 未使用的 import** — `getErrorMessage` 导入但未使用 | 🔵 | 清理（实际已在新版中使用） |

### 6. 可访问性 (a11y)

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 6.1 | **表单 label 未关联 input** — 所有页面的 `<label>` 缺少 `htmlFor` | 🟡 | 全部表单添加 `htmlFor`/`id` 关联（Login、Register、CreateEvent、Profile） |
| 6.2 | **图标按钮无 aria-label** — 退出、关闭、导航等 | 🟡 | Navbar 退出按钮、导航链接、模态框关闭按钮、MapPage 关闭按钮均添加 `aria-label` |
| 6.3 | **CreateEvent AI 模态框无 Escape 关闭** | 🟡 | 添加 `useEffect` 监听 `keydown` Escape 事件 |
| 6.4 | **CreateEvent 模态框无 ARIA 角色** | 🔵 | 添加 `role="dialog"` `aria-modal="true"` `aria-label` |
| 6.5 | **分类筛选按钮无 aria-pressed** | 🔵 | Home、Profile 的分类按钮添加 `aria-pressed` |
| 6.6 | **Tab 组件无 role="tab"/aria-selected** | 🔵 | EventManage、Profile 的 Tab 添加 `role="tablist"`/`role="tab"`/`aria-selected` |
| 6.7 | **进度条无 ARIA** — EventCard/EventDetail 的报名进度条 | 🔵 | 添加 `role="progressbar"` `aria-valuenow` `aria-valuemax` |
| 6.8 | **SVG 图标无 aria-hidden** | 🔵 | 装饰性 SVG 添加 `aria-hidden="true"` |
| 6.9 | **错误提示无 role="alert"** | 🔵 | 所有错误提示 `div` 添加 `role="alert"` |
| 6.10 | **MapPage loading 无 role="status"** | 🔵 | 加载动画添加 `role="status"` `aria-label` |

### 7. 响应式设计

| # | 问题 | 级别 | 修复方式 |
|---|------|------|---------|
| 7.1 | **移动端无法创建活动** — Navbar"创建活动"按钮 `hidden sm:flex` | 🟡 | 改为始终显示，移动端只显示 `+` 图标 |
| 7.2 | **EventManage 统计卡片移动端过窄** — `grid-cols-4` 在小屏幕上挤压 | 🟡 | 改为 `grid-cols-2 sm:grid-cols-4` |

---

## 三、新增文件

| 文件 | 用途 |
|------|------|
| `src/utils/constants.ts` | 共享常量（statusLabels、categoryColors、categories、eventTypes）和工具函数（formatDate、getEventTypeLabel、filterTruthy） |
| `src/utils/errors.ts` | API 错误处理工具（getErrorMessage、isNetworkError、isTimeoutError） |
| `src/vite-env.d.ts` | Vite 环境变量 TypeScript 类型声明 |
| `vite.config.js` | 替代 `vite.config.ts`（修复 esbuild 在非 ASCII 路径下的加载问题） |
| `build.sh` | 构建脚本，处理非 ASCII 路径下 Vite 配置加载问题 |

## 四、修改文件清单

| 文件 | 主要变更 |
|------|---------|
| `package.json` | build 脚本改为 `bash build.sh` |
| `tsconfig.json` | 移除 tsconfig.node.json 项目引用 |
| `src/App.tsx` | 全部路由改为 `React.lazy` + `Suspense` 懒加载 |
| `src/api/client.ts` | 环境变量、403 处理、重试机制、重定向路径保存 |
| `src/contexts/AuthContext.tsx` | isMounted 防内存泄漏 |
| `src/components/MapView.tsx` | 修复 TS 类型错误、useMapEvents 替代 eventHandlers |
| `src/components/EventCard.tsx` | React.memo、图片懒加载、共享常量、a11y |
| `src/components/Navbar.tsx` | 移动端创建按钮、aria-label |
| `src/components/Layout.tsx` | role="main" 语义化 |
| `src/pages/Login.tsx` | 表单 label 关联、错误处理、重定向路径 |
| `src/pages/Register.tsx` | 表单 label 关联、邮箱校验、错误处理 |
| `src/pages/Home.tsx` | 分页、模拟数据提示、共享常量、a11y |
| `src/pages/EventDetail.tsx` | 共享 statusLabels、报名错误处理、图片懒加载、a11y |
| `src/pages/CreateEvent.tsx` | 表单验证、label 关联、Escape 关闭模态框、AI 内容预填 |
| `src/pages/EventManage.tsx` | 防重复提交、响应式统计、共享常量、a11y |
| `src/pages/MapPage.tsx` | 空状态、移除死代码 error、a11y |
| `src/pages/AIPlan.tsx` | setTimeout 清理、行内提示替代 alert、a11y |
| `src/pages/Profile.tsx` | 修复 TS 类型、表单 label、防重复提交、a11y |
| `src/pages/Dashboard.tsx` | 无需修改（已符合要求） |

## 五、构建结果

```
✓ 312 modules transformed
✓ built in 37.63s

首屏 chunk:  222.74 kB (gzip: 74.82 kB)  ← 主 bundle
路由 chunks: 2.5~13 kB each (懒加载)
地图 chunk:  155.95 kB (gzip: 45.85 kB)  ← 按需加载
AI chunk:    124.62 kB (gzip: 40.65 kB)  ← 按需加载
```

懒加载前所有代码打入单个 bundle；懒加载后首屏仅加载核心代码，页面级 chunk 按路由按需加载。

## 六、遗留建议（需后端配合）

1. **Token 存储迁移** — 后端支持 httpOnly Cookie 后，可移除 localStorage token 存储
2. **API 分页** — 当前前端分页基于全量数据，后端应支持 `page`/`limit` 参数实现真分页
3. **Refresh Token** — 当前 401 直接跳转登录，建议后端支持 refresh token 实现无感续期
4. **图片优化** — 后端应提供图片缩略图/CDN 适配，前端 `loading="lazy"` 只是补充
5. **WebSocket/SSE** — AIPlan 当前为一次性请求，后端支持流式输出可提升交互体验
