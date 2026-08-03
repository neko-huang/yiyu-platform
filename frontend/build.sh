#!/bin/bash
# 构建脚本：先进行 TypeScript 类型检查，再执行 Vite 构建
# 处理路径中包含非 ASCII 字符导致 Vite 配置加载失败的问题

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 类型检查
cd "$SCRIPT_DIR"
npx tsc --noEmit

# Vite 配置文件加载在非 ASCII 路径下可能失败，通过符号链接规避
SYMLINK="/tmp/yiyu-build-$$"
ln -sf "$SCRIPT_DIR" "$SYMLINK"
trap "rm -f '$SYMLINK'" EXIT

cd "$SYMLINK"
npx vite build
