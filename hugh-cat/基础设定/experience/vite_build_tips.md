# Vite 构建相关经验

## Vite 配置文件在含中文/非ASCII字符路径下加载失败的问题
### 现象
当项目的绝对路径中包含中文等非ASCII字符时，Vite 尝试使用 esbuild 打包 vite.config.ts/ vite.config.js 配置文件时会抛出错误 `config must export or return an object`，导致构建失败。

### 根因
Vite 内部使用 esbuild 对配置文件进行 bundling 动态加载，esbuild 在处理包含非ASCII字符的路径时存在编码兼容问题，无法正常解析配置文件。

### 解决方案
创建指向原项目路径的临时符号链接到纯ASCII字符路径下，在符号链接路径中执行 Vite 构建，构建完成后删除临时符号链接即可。示例构建脚本：
```bash
# build.sh
SYMLINK="/tmp/project-build-$$"
ln -sf "$SCRIPT_DIR" "$SYMLINK"
trap "rm -f '$SYMLINK'" EXIT
cd "$SYMLINK"
npx vite build
```
