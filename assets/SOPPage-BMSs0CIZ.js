import{a as D,r,v as W,j as e,w as E,x as F,y as I}from"./index-DcO0O1wg.js";import{a as L}from"./constants-yAD4NwD5.js";const v=[{id:1,user_id:1,name:"户外徒步活动 SOP",category:"户外",description:"适用于 20-50 人的户外徒步活动标准流程模板",content:`# 户外徒步活动 SOP

## 活动概述
- 适用场景：周末短途徒步、城市周边登山
- 预期规模：20-50 人
- 活动时长：6-8 小时

## 筹备阶段
1. 路线规划（活动前 3 周）：确认路线难度、长度、补给点
2. 场地踩点（活动前 2 周）：实地走一遍路线
3. 人员分工（活动前 2 周）：领队、收尾、摄影、后勤
4. 报名开启（活动前 2 周）：发布活动、设置报名链接
5. 物料采购（活动前 1 周）：急救包、对讲机、补给品

## 活动当天
- 07:30 集合签到
- 08:00 热身 & 安全须知
- 08:30 出发
- 12:00 午餐休息
- 16:00 返回终点
- 16:30 合影 & 解散

## 物料清单
| 物料 | 数量 | 预算 |
|------|------|------|
| 急救包 | 2 | ¥100 |
| 对讲机 | 4 | ¥200(租赁) |
| 矿泉水 | 100瓶 | ¥150 |
| 能量棒 | 60根 | ¥180 |`,tags:["徒步","户外","登山"],source_event_id:null,is_public:!0,is_active:!0,usage_count:12,created_at:"2026-07-15T10:00:00",updated_at:"2026-07-15T10:00:00"},{id:2,user_id:1,name:"读书分享会 SOP",category:"读书",description:"适用于 10-30 人的读书会标准流程",content:`# 读书分享会 SOP

## 活动概述
- 适用场景：定期读书会、主题阅读分享
- 预期规模：10-30 人
- 活动时长：2-3 小时

## 筹备阶段
1. 选定书目（活动前 3 周）
2. 预定场地（活动前 2 周）
3. 发布活动（活动前 2 周）
4. 准备讨论提纲（活动前 1 周）

## 活动流程
- 14:00 签到 & 茶歇
- 14:15 主持人开场
- 14:30 嘉宾分享
- 15:30 自由讨论
- 16:30 总结 & 下期预告`,tags:["读书","分享"],source_event_id:null,is_public:!0,is_active:!0,usage_count:8,created_at:"2026-07-20T14:00:00",updated_at:"2026-07-20T14:00:00"},{id:3,user_id:1,name:"线下工作坊 SOP",category:"艺术",description:"适用于手工、绘画等创意类工作坊",content:`# 创意工作坊 SOP

## 活动概述
- 适用场景：手工DIY、绘画、书法等
- 预期规模：10-20 人
- 活动时长：3-4 小时

## 筹备阶段
1. 确定主题 & 讲师（活动前 3 周）
2. 物料采购（活动前 2 周）
3. 报名发布（活动前 2 周）
4. 场地布置方案（活动前 1 周）

## 活动流程
- 09:30 签到 & 领取材料包
- 10:00 讲师介绍 & 示范
- 10:30 学员动手制作
- 12:00 作品展示 & 点评
- 12:30 合影 & 结束`,tags:["手工","工作坊","艺术"],source_event_id:null,is_public:!0,is_active:!0,usage_count:5,created_at:"2026-07-25T09:00:00",updated_at:"2026-07-25T09:00:00"}];function q(){const _=D(),[i,c]=r.useState("list"),[d,o]=r.useState(v),[n,p]=r.useState(null),[w,u]=r.useState(!0),[m,S]=r.useState(""),[x,k]=r.useState(""),[g,h]=r.useState(!1),[a,l]=r.useState({name:"",category:"通用",description:"",content:"",tags:[],is_public:!1}),[y,j]=r.useState(""),b=r.useCallback(async()=>{u(!0);try{const s={};m&&(s.category=m),x&&(s.keyword=x);const t=await W(s);o(t.items)}catch{o(v)}finally{u(!1)}},[m,x]);r.useEffect(()=>{b()},[b]);const C=async s=>{if(s.preventDefault(),!!a.name.trim()){h(!0);try{const t=await E(a);o([t,...d]),l({name:"",category:"通用",description:"",content:"",tags:[],is_public:!1}),c("list")}catch{const t={id:Date.now(),user_id:1,name:a.name,category:a.category,description:a.description||null,content:a.content||null,tags:a.tags||[],source_event_id:null,is_public:a.is_public||!1,is_active:!0,usage_count:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};o([t,...d]),c("list")}finally{h(!1)}}},O=async s=>{if(confirm("确定删除此模板？")){try{await F(s)}catch{}o(d.filter(t=>t.id!==s)),(n==null?void 0:n.id)===s&&(p(null),c("list"))}},P=async s=>{try{await I(s.id)}catch{}o(d.map(t=>t.id===s.id?{...t,usage_count:t.usage_count+1}:t)),sessionStorage.setItem("sopTemplateContent",JSON.stringify({title:s.name.replace(" SOP",""),description:s.content,tags:(s.tags||[]).join(", "),category:s.category})),_("/events/create")},T=s=>{p(s),c("detail")},f=()=>{var t;const s=y.trim();s&&!((t=a.tags)!=null&&t.includes(s))&&(l({...a,tags:[...a.tags||[],s]}),j(""))},N=["通用",...L.filter(s=>s!=="其他")];return e.jsxs("div",{className:"max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8",children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-gray-900",children:"SOP 模板中心"}),e.jsx("p",{className:"text-gray-500 text-sm mt-1",children:"标准化管理活动流程，让每次活动都有章可循"})]}),i==="list"&&e.jsx("button",{onClick:()=>c("create"),className:"btn-primary",children:"+ 新建模板"}),(i==="detail"||i==="create")&&e.jsx("button",{onClick:()=>c("list"),className:"btn-secondary",children:"← 返回列表"})]}),i==="list"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex flex-wrap gap-3 mb-6",children:[e.jsx("input",{type:"text",value:x,onChange:s=>k(s.target.value),placeholder:"搜索模板...",className:"input-field w-48"}),e.jsxs("select",{value:m,onChange:s=>S(s.target.value),className:"input-field w-32",children:[e.jsx("option",{value:"",children:"全部分类"}),N.map(s=>e.jsx("option",{value:s,children:s},s))]})]}),w?e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",children:[1,2,3].map(s=>e.jsxs("div",{className:"card p-6 animate-pulse",children:[e.jsx("div",{className:"h-6 bg-gray-200 rounded w-2/3 mb-3"}),e.jsx("div",{className:"h-4 bg-gray-200 rounded w-full mb-2"}),e.jsx("div",{className:"h-4 bg-gray-200 rounded w-1/2"})]},s))}):e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",children:[d.map(s=>e.jsxs("div",{className:"card p-5 hover:shadow-md transition-shadow cursor-pointer",onClick:()=>T(s),children:[e.jsxs("div",{className:"flex items-start justify-between mb-2",children:[e.jsx("h3",{className:"font-semibold text-gray-900 line-clamp-1",children:s.name}),e.jsx("span",{className:"tag bg-primary-100 text-primary-700 text-xs flex-shrink-0 ml-2",children:s.category})]}),e.jsx("p",{className:"text-sm text-gray-500 line-clamp-2 mb-3",children:s.description||"暂无描述"}),e.jsxs("div",{className:"flex items-center justify-between text-xs text-gray-400",children:[e.jsx("div",{className:"flex gap-1 flex-wrap",children:(s.tags||[]).slice(0,3).map(t=>e.jsx("span",{className:"bg-gray-100 text-gray-600 px-2 py-0.5 rounded",children:t},t))}),e.jsxs("span",{children:["已使用 ",s.usage_count," 次"]})]})]},s.id)),d.length===0&&e.jsxs("div",{className:"col-span-full text-center py-16 text-gray-400",children:[e.jsx("p",{className:"text-4xl mb-3",children:"📋"}),e.jsx("p",{children:"暂无模板，点击上方按钮创建第一个 SOP 模板"})]})]})]}),i==="detail"&&n&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"card p-6",children:[e.jsxs("div",{className:"flex items-start justify-between mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-bold text-gray-900",children:n.name}),e.jsxs("div",{className:"flex items-center gap-3 mt-2 text-sm text-gray-500",children:[e.jsx("span",{className:"tag bg-primary-100 text-primary-700",children:n.category}),e.jsxs("span",{children:["已使用 ",n.usage_count," 次"]}),e.jsx("span",{children:new Date(n.created_at).toLocaleDateString("zh-CN")})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>P(n),className:"btn-primary text-sm",children:"📋 使用此模板"}),e.jsx("button",{onClick:()=>O(n.id),className:"px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg",children:"删除"})]})]}),n.description&&e.jsx("p",{className:"text-gray-600 mb-4",children:n.description}),e.jsx("div",{className:"flex gap-1 flex-wrap mb-4",children:(n.tags||[]).map(s=>e.jsx("span",{className:"bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm",children:s},s))})]}),e.jsxs("div",{className:"card p-6",children:[e.jsx("h3",{className:"font-semibold text-gray-900 mb-4",children:"模板内容"}),e.jsx("div",{className:"prose prose-sm max-w-none text-gray-700 leading-relaxed",children:(n.content||"暂无内容").split(`
`).map((s,t)=>s.startsWith("# ")?e.jsx("h2",{className:"text-xl font-bold text-gray-900 mt-4 mb-2",children:s.replace("# ","")},t):s.startsWith("## ")?e.jsx("h3",{className:"text-lg font-semibold text-gray-800 mt-3 mb-2",children:s.replace("## ","")},t):s.startsWith("### ")?e.jsx("h4",{className:"text-base font-semibold text-gray-800 mt-2 mb-1",children:s.replace("### ","")},t):s.startsWith("- ")?e.jsx("li",{className:"ml-4",children:s.replace("- ","")},t):s.startsWith("| ")?e.jsx("p",{className:"font-mono text-xs bg-gray-50 px-2 py-0.5",children:s},t):s.trim()?e.jsx("p",{className:"mb-1",children:s},t):e.jsx("br",{},t))})]})]}),i==="create"&&e.jsxs("div",{className:"card p-6 max-w-3xl mx-auto",children:[e.jsx("h2",{className:"text-xl font-bold text-gray-900 mb-6",children:"创建 SOP 模板"}),e.jsxs("form",{onSubmit:C,className:"space-y-5",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"模板名称 *"}),e.jsx("input",{type:"text",value:a.name,onChange:s=>l({...a,name:s.target.value}),className:"input-field",placeholder:"如：周末读书会标准流程",required:!0})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"分类"}),e.jsx("select",{value:a.category,onChange:s=>l({...a,category:s.target.value}),className:"input-field",children:N.map(s=>e.jsx("option",{value:s,children:s},s))})]}),e.jsx("div",{className:"flex items-end",children:e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer",children:[e.jsx("input",{type:"checkbox",checked:a.is_public||!1,onChange:s=>l({...a,is_public:s.target.checked}),className:"w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"}),e.jsx("span",{className:"text-sm text-gray-700",children:"公开模板（其他用户可见）"})]})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"描述"}),e.jsx("input",{type:"text",value:a.description||"",onChange:s=>l({...a,description:s.target.value}),className:"input-field",placeholder:"简要描述此模板的适用场景..."})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"标签"}),e.jsxs("div",{className:"flex gap-2 mb-2",children:[e.jsx("input",{type:"text",value:y,onChange:s=>j(s.target.value),onKeyDown:s=>{s.key==="Enter"&&(s.preventDefault(),f())},className:"input-field flex-1",placeholder:"输入标签后按回车"}),e.jsx("button",{type:"button",onClick:f,className:"btn-secondary text-sm",children:"添加"})]}),e.jsx("div",{className:"flex gap-1 flex-wrap",children:(a.tags||[]).map(s=>e.jsxs("span",{className:"bg-primary-100 text-primary-700 px-2 py-1 rounded text-sm flex items-center gap-1",children:[s,e.jsx("button",{type:"button",onClick:()=>l({...a,tags:a.tags.filter(t=>t!==s)}),className:"text-primary-400 hover:text-primary-600",children:"×"})]},s))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"模板内容 (Markdown)"}),e.jsx("textarea",{value:a.content||"",onChange:s=>l({...a,content:s.target.value}),className:"input-field font-mono text-sm",rows:15,placeholder:`# 活动名称 SOP

## 活动概述
...

## 筹备阶段
1. ...
2. ...

## 活动当天
- 09:00 ...

## 物料清单
| 物料 | 数量 | 预算 |
|------|------|------|`})]}),e.jsxs("div",{className:"flex gap-3 pt-2",children:[e.jsx("button",{type:"submit",disabled:g,className:"btn-primary disabled:opacity-50",children:g?"创建中...":"创建模板"}),e.jsx("button",{type:"button",onClick:()=>c("list"),className:"btn-secondary",children:"取消"})]})]})]})]})}export{q as default};
