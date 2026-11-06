# 大文件恢复说明

本仓库包含前后端源码、配置示例、部署脚本、文档和普通素材。按项目所有者要求，模型和全剧视频不上传；本地原文件保留。

## 模型

从模型发布方下载完整模型目录到以下位置：

- https://huggingface.co/BAAI/bge-m3 → `models/bge-m3/`
- https://huggingface.co/BAAI/bge-reranker-v2-m3 → `models/bge-reranker-v2-m3/`

可安装 Hugging Face CLI 后，在项目根目录运行：

```powershell
hf download BAAI/bge-m3 --local-dir models/bge-m3
hf download BAAI/bge-reranker-v2-m3 --local-dir models/bge-reranker-v2-m3
```

环境变量路径见 `.env.example`。本地向量索引 `data/qdrant-rag/` 不提交，由 RAG 服务初始化重建。

## 全剧视频

项目尚未配置可分发的视频下载地址。请从原项目备份复制具有使用授权的视频到 `public/videos/`，保持以下文件名：

- `biyuzan.mp4`
- `hongloumeng.mp4`
- `liangzhu.mp4`
- `xianglinsao.mp4`
- `xixiangji.mp4`
- `zhuiyu.mp4`

原始 `越剧视频/` 文件夹也保留在本地，未上传。缺少以上文件时，对应本地全剧播放不可用。

## 设计文件

PSD 和设计输出 PNG 使用 Git LFS。安装 Git LFS 后运行 `git lfs pull` 获取完整文件。

## 环境和依赖

真实 `.env`、浏览器个人数据、日志、依赖和构建缓存不上传。复制 `.env.example` 为 `.env` 并填写本机配置，按根目录 README 安装依赖和启动服务。
