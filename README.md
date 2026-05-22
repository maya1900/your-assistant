# Your Assistant

一个本地优先的 AI 聊天助手，类 ChatGPT 多会话体验，支持流式输出、Markdown 渲染、代码高亮、对话导出等能力。

## 技术栈

- **框架**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand（轻量、零样板）
- **持久化**: LocalStorage
- **Markdown**: react-markdown + remark-gfm + react-syntax-highlighter
- **AI 接入**: 任意兼容 OpenAI Chat Completions 协议的国产模型（DeepSeek / Kimi / 通义 等），用户在设置面板自行填写 baseURL / model / apiKey

## 快速开始

```bash
npm install
npm run dev
```

首次启动后点击右上角 **设置** 图标，填写：

- **Base URL**：如 `https://api.deepseek.com/v1`
- **Model**：如 `deepseek-chat`
- **API Key**：你自己的密钥

然后就可以开始对话。

## 文档

- [产品需求 SPEC.md](docs/SPEC.md)
- [架构设计 ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [实现路线 ROADMAP.md](docs/ROADMAP.md)
