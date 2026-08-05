# 工具使用经验
这里沉淀在使用各类工具过程中积累的技巧与注意事项，方便日后复用。
- **Windows Batch闪退排查**：最常见根因是Unix LF换行符不兼容Windows CMD，必须转为CRLF格式，详情见 基础设定/experience/windows_batch_debug.md
- **Vite非ASCII路径构建问题**：路径含中文时Vite加载配置失败，用符号链接指向无特殊字符路径执行构建可规避。详见 基础设定/experience/vite_build_tips.md