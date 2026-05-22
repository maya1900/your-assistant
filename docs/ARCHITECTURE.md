# 架构设计 ARCHITECTURE

## 一、整体分层

```
┌─────────────────────────────────────────┐
│  UI 层 (components/)                     │
│  Sidebar · ChatView · MessageBubble ...  │
├─────────────────────────────────────────┤
│  状态层 (store/)                          │
│  Zustand store + LocalStorage 中间件      │
├─────────────────────────────────────────┤
│  服务层 (services/)                       │
│  llmClient (SSE 流式) · storage           │
├─────────────────────────────────────────┤
│  类型层 (types/)                          │
│  Message · Conversation · Settings       │
└─────────────────────────────────────────┘
```

## 二、目录结构

```
your-assistant/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css                  # Tailwind 入口 + 全局样式
    ├── types/
    │   └── index.ts                # Message / Conversation / Settings
    ├── store/
    │   ├── useChatStore.ts         # 会话与消息状态
    │   └── useSettingsStore.ts     # 模型设置
    ├── services/
    │   ├── llmClient.ts            # OpenAI 兼容流式调用
    │   └── storage.ts              # LocalStorage 读写封装
    ├── hooks/
    │   ├── useStreamingChat.ts     # 发送+流式+中断 hook
    │   └── useAutoScroll.ts        # 消息列表自动滚动
    ├── components/
    │   ├── Sidebar/
    │   │   ├── Sidebar.tsx
    │   │   ├── ConversationItem.tsx
    │   │   └── NewChatButton.tsx
    │   ├── Chat/
    │   │   ├── ChatView.tsx
    │   │   ├── MessageList.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── ChatInput.tsx
    │   │   └── StopButton.tsx
    │   ├── Markdown/
    │   │   ├── MarkdownRenderer.tsx
    │   │   └── CodeBlock.tsx       # 含一键复制
    │   ├── Settings/
    │   │   └── SettingsDialog.tsx
    │   └── ui/                     # 基础组件：Button / Dialog / Input
    └── lib/
        ├── id.ts                   # nanoid 封装
        ├── cn.ts                   # tailwind className 合并 (clsx + tailwind-merge)
        └── exporters.ts            # 导出 Markdown / JSON
```

## 三、状态管理（Zustand）

### useChatStore

```typescript
interface ChatState {
  conversations: Conversation[];
  activeId: string | null;

  // selectors
  getActive(): Conversation | undefined;

  // actions
  createConversation(): string;        // 返回新 id
  deleteConversation(id: string): void;
  renameConversation(id: string, title: string): void;
  setActive(id: string): void;
  clearActiveMessages(): void;
  setSystemPrompt(id: string, prompt: string): void;

  // 消息编辑
  appendMessage(id: string, msg: Message): void;
  updateMessage(convId: string, msgId: string, patch: Partial<Message>): void;
  truncateAfter(convId: string, msgId: string): void;  // 编辑用户消息时丢弃后续
}
```

使用 [zustand/middleware](https://github.com/pmndrs/zustand) 的 `persist` 中间件自动写入 LocalStorage。

### useSettingsStore

同样 persist，存 baseURL / apiKey / model / temperature / defaultSystemPrompt。

## 四、流式 API 客户端

`services/llmClient.ts` 提供一个核心函数：

```typescript
interface StreamRequest {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  messages: { role: Role; content: string }[];
  signal: AbortSignal;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(req: StreamRequest): Promise<void>;
```

实现要点：

1. 直接 `fetch(${baseURL}/chat/completions, { method: POST, signal })`
2. body 必须包含 `stream: true`
3. 用 `response.body.getReader()` 读取 ReadableStream，按 `\n\n` 切分 SSE 事件
4. 每条事件解析 `data: {...}`，跳过 `data: [DONE]`
5. 抽取 `choices[0].delta.content` 调用 `onDelta`
6. `AbortError` 静默处理（用户主动中断），其它错误走 `onError`

为什么不用第三方 SDK：OpenAI 官方 SDK 不能保证国产模型兼容，且会带来不必要的 bundle 体积；自己写 ~80 行就能搞定。

## 五、流式 hook 设计

`hooks/useStreamingChat.ts` 封装"发送 + 流式追加 + 中断"：

```typescript
function useStreamingChat() {
  const isStreaming: boolean;
  function send(userInput: string): Promise<void>;
  function stop(): void;
  function regenerate(): Promise<void>;
}
```

内部维护一个 `AbortController` ref，`stop()` 调用 `controller.abort()`。组件用 `isStreaming` 切换发送/Stop 按钮。

## 六、Markdown 渲染

- `react-markdown` + `remark-gfm`（表格 / 任务列表）
- 代码块通过 `components.code` 自定义渲染：
  - 行内代码：`<code class="bg-zinc-100 px-1 rounded">`
  - 代码块：`react-syntax-highlighter` + 自带语言探测 + 右上角复制按钮
- 主题：`oneLight` 配合明亮活泼风格

## 七、错误与边界

| 场景 | 处理 |
|------|------|
| API Key 未填 | 输入框 disabled，提示条 |
| 网络错误 | assistant 气泡变红，"重试"按钮 |
| 4xx（401 / 429） | 解析 response.json().error.message，展示给用户 |
| 流中途断开 | status=error，已生成内容保留 |
| LocalStorage 写满 | catch QuotaExceededError，弹 toast 提示用户清理旧对话 |

## 八、安全说明

由于无后端，API Key 存在 LocalStorage 中，仅用于个人本地使用。不应在生产环境直接部署给多人使用（Key 会暴露在浏览器）。设置面板需要在 Key 输入框旁加一行小字说明。
