## 长期行为规则

## 核心状态锚点
- **工程开发规范**：严格遵守用户制定的10项全流程开发准则，包含动手前先出计划、渐进交付、安全底线、版本控制规范等，已完整记录在基础设定/SOUL.md。

- **益屿活动管理平台项目状态**：[已过时 2026-08-04，本次为本地上传版本全新从零实现Phase1] Phase 1+2+3 核心完成。Phase 1（用户画像/推荐/搜索/上传/地图/财务）+ Phase 2（活动复盘/AI摘要/SOP模板库/Dashboard财务图表/AI多平台文案生成）+ Phase 3（游戏化成就积分/回忆相册/讨论区）。最新commit: ee9f94a，仓库：https://github.com/neko-huang/yiyu-platform （2026-08-04）
- **益屿本地上传版Phase1状态**：本地上传的yiyu-platform项目Phase1后端已从零实现完成，14项全量测试通过。详见 `recent_memory/project/yiyu_platform_phase1_implementation_20260804.md` （2026-08-04）
- **run.bat 菜单循环**：每个操作完成后 goto :menu 回到菜单，只有选 0（Exit）才退出。
- **run.bat 停止逻辑**：先 taskkill /FI "WINDOWTITLE eq YiYu-Backend*" /T 关窗口及子进程，再按端口兜底杀进程。
- **main.py 启动入口**：添加 `if __name__ == "__main__"` 块 + uvicorn.run()，使 python main.py 直接启动。
- **登录后白屏修复**：Recommendation 类型从嵌套改为扁平（extends Event），前端 getRecommendations 从 res.data.items 取数据。
- **前端错误处理**：errors.ts 支持 FastAPI 422 数组格式 detail，可选链 response?.status。
- **益屿本地上传版前端优化状态**：前端全量代码审查32项问题修复完成，构建100%通过。详见 `recent_memory/project/yiyu_frontend_code_review_202608.md` （2026-08-04）
- **益屿本地上传版前端全量创建状态**：前端从零搭建完整骨架与所有业务页面，项目全量创建完成、构建100%通过。详见 `recent_memory/project/yiyu_platform_frontend_full_create_20260803.md` （2026-08-03）
- **益屿活动管理平台全量基础后端实现状态**：2026-08-03 从零搭建完成FastAPI+SQLAlchemy全栈后端，支持活动、报名、财务、AI生成全核心API，11项端到端测试通过。详见 `recent_memory/project/yiyu_backend_full_complete_20260803.md`
- **益屿本地上传版Phase1前端状态**：用户画像、搜索增强、推荐展示、导航增强4大模块全量实现，TypeScript类型检查和Vite生产构建均通过。详见 `recent_memory/project/yiyu_platform_phase1_frontend_20260804.md` （2026-08-04）
- **益屿本地上传版后端安全审查完成**：后端全量22项安全与代码质量问题全部修复，25项自动化测试100%通过，全量安全加固完成。详见 `recent_memory/project/yiyu_backend_security_audit_20260803.md` （2026-08-04）
- **益屿本地上传版后端缺失模块开发状态**：AI文案生成、活动相册、讨论区、成就积分四大缺失模块全部开发完成，12份文件语法100%校验通过。详见 `recent_memory/project/yiyu_platform_backend_missing_modules_20260805.md` （2026-08-05）