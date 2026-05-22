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

首次启动会自动弹设置面板，填写：

- **Base URL**：如 `https://api.deepseek.com/v1`
- **Model**：如 `deepseek-chat`
- **API Key**：你自己的密钥

填完点设置面板里的 **测试** 按钮验证连通性（会发一条非流式 ping，报告延迟与上游错误）。通过后保存设置即可对话。

> dev 阶段所有 LLM 请求都会经 Vite 中间件 `/api/llm/*` 动态代理，绕开浏览器同源限制；生产环境直连 Base URL（部署时需自行加反向代理）。

## 文档

- [产品需求 SPEC.md](docs/SPEC.md)
- [架构设计 ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [实现路线 ROADMAP.md](docs/ROADMAP.md)
