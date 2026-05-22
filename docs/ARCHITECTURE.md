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
├── tsconfig.json · tsconfig.app.json · tsconfig.node.json
├── vite.config.ts                # 含 LLM dev 代理中间件（见 § 五）
├── tailwind.config.js
├── postcss.config.js
├── api/
│   └── llm-proxy.ts              # Vercel Edge Function: prod 端 LLM 代理（见 § 五）
├── vercel.json                   # Vercel rewrite + 部署配置
├── design/index.html             # 静态 UI 原型，React 还原参照
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css                 # Tailwind 入口 + 全局样式 / 自定义工具类
    ├── vite-env.d.ts             # import.meta.env 类型
    ├── types/
    │   └── index.ts              # Message / Conversation / Settings
    ├── store/
    │   ├── useChatStore.ts       # 会话与消息状态（zustand + persist）
    │   └── useSettingsStore.ts   # 模型设置（zustand + persist）
    ├── services/
    │   └── llmClient.ts          # streamChat + testConnection
    ├── hooks/
    │   ├── useStreamingChat.ts   # send / stop / regenerate / editAndResend
    │   └── useAutoScroll.ts      # 消息列表自动贴底
    ├── components/
    │   ├── Sidebar/
    │   │   └── Sidebar.tsx       # 含 ConversationItem 子组件
    │   ├── Chat/
    │   │   ├── ChatView.tsx
    │   │   ├── ChatInput.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── SystemPromptDialog.tsx
    │   ├── Markdown/
    │   │   ├── MarkdownRenderer.tsx
    │   │   └── CodeBlock.tsx     # 高亮 + 复制按钮
    │   └── Settings/
    │       └── SettingsDialog.tsx
    └── lib/
        ├── id.ts                 # nanoid 封装
        ├── cn.ts                 # clsx + tailwind-merge
        └── exporters.ts          # 导出 Markdown / JSON
```

> LocalStorage 读写没有单独抽 `storage.ts`：Zustand `persist` 中间件已经覆盖了序列化、读写、版本控制，再加一层只会复杂化。

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

## 四、LLM 客户端

`services/llmClient.ts` 暴露两个对外函数：

```typescript
// 4.1 主链路：流式聊天
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

// 4.2 设置面板用：非流式 ping，验证 Base URL / Key / Model
interface TestConnectionRequest {
  baseURL: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}
interface TestConnectionResult {
  ok: boolean;
  latencyMs: number;
  reply?: string;     // 上游回声片段，仅成功时
  error?: string;     // 上游错误，仅失败时
}
export async function testConnection(req: TestConnectionRequest): Promise<TestConnectionResult>;
```

`streamChat` 实现要点：

1. 通过 `buildEndpoint()` 统一拿到 url + headers（见下方 § 五 dev 代理）
2. body 必含 `stream: true`
3. 用 `response.body.getReader()` 读取 ReadableStream，按 `\n\n` 切分 SSE 事件
4. 每条事件解析 `data: {...}`，跳过 `data: [DONE]`
5. 抽取 `choices[0].delta.content` 调用 `onDelta`
6. `AbortError` 静默处理（用户主动中断），其它错误走 `onError`

`testConnection` 共享同一份 `buildEndpoint()`，发 `messages=[{role:'user',content:'ping'}], max_tokens=5, stream:false`，用 `performance.now()` 计算往返延迟。

为什么不用第三方 SDK：OpenAI 官方 SDK 不能保证国产模型兼容，且会带来不必要的 bundle 体积；自己写 ~120 行就能搞定。

## 五、CORS 代理（dev + prod 双端实现）

浏览器直连任意 LLM 服务多半会被 CORS 拦截。我们用一条统一的协议解决：

**协议**：前端永远调用同源 `/api/llm/<sub>`，并在请求头里塞 `X-LLM-Base-URL: <用户填的 baseURL>`。后端按这个头动态决定转发目标，流式响应原样回传。

两端各有一份实现：

### 5.1 Dev — Vite 中间件（`vite.config.ts`）

```ts
const llmProxy: Connect.NextHandleFunction = async (req, res) => {
  const baseURL = req.headers['x-llm-base-url'];
  const upstream = await fetch(baseURL + req.url, { method: req.method, headers, body });
  res.statusCode = upstream.status;
  upstream.headers.forEach((v, k) => res.setHeader(k, v));
  res.flushHeaders();
  // 边读边写，保证 SSE 流式不被缓冲
  const reader = upstream.body.getReader();
  while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
  res.end();
};
```

要点：`flushHeaders()` 提前把响应头送出去，避免 Node 默认缓冲打断 SSE。

### 5.2 Prod — Vercel Edge Function（`api/llm-proxy.ts` + `vercel.json`）

非 Next.js 的 Vercel 项目里 `[...catchall].ts` 的文件名路由不稳定，改用更明确的 vercel.json rewrite。

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/llm/:path*", "destination": "/api/llm-proxy?path=:path*" }
  ]
}
```

```ts
// api/llm-proxy.ts
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const baseURL = req.headers.get('x-llm-base-url')!;
  const url = new URL(req.url);
  const subpath = url.searchParams.get('path')!;   // chat/completions
  const target = `${baseURL}/${subpath}`;

  const upstream = await fetch(target, {
    method: req.method,
    headers: fwdHeaders,
    body: req.body,
    // @ts-expect-error - duplex 流式请求体必需
    duplex: 'half',
  });

  // 关键：把 upstream.body 直接传给 Response 构造器，保留 SSE
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
```

要点：Edge runtime 原生支持 Web Streams，`new Response(upstream.body)` 直接透传 ReadableStream，不需要手动 reader。

### 5.3 客户端无感切换

`llmClient.ts` 只调用 `/api/llm/chat/completions` 一条路径，dev 走中间件、prod 走 Edge Function，前端代码不需要任何分支判断。

### 5.4 部署到其他平台

如果不部署到 Vercel，需要自行实现等价的代理（Cloudflare Workers / Netlify Functions / Nginx 等），保证同源路径 + `X-LLM-Base-URL` 头协议一致即可。

## 六、流式 hook 设计

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

## 七、Markdown 渲染

- `react-markdown` + `remark-gfm`（表格 / 任务列表）
- 代码块通过 `components.code` 自定义渲染：
  - 行内代码：`<code class="bg-zinc-100 px-1 rounded">`
  - 代码块：`react-syntax-highlighter` + 自带语言探测 + 右上角复制按钮
- 主题：`oneLight` 配合明亮活泼风格

## 八、错误与边界

| 场景 | 处理 |
|------|------|
| API Key 未填 | 输入框 disabled，提示条 |
| 网络错误 | assistant 气泡变红，"重试"按钮 |
| 4xx（401 / 429） | 解析 response.json().error.message，展示给用户 |
| 流中途断开 | status=error，已生成内容保留 |
| LocalStorage 写满 | catch QuotaExceededError，弹 toast 提示用户清理旧对话 |

## 九、安全说明

由于无后端，API Key 存在 LocalStorage 中，仅用于个人本地使用。不应在生产环境直接部署给多人使用（Key 会暴露在浏览器）。设置面板需要在 Key 输入框旁加一行小字说明。

## 十、响应式策略

实现 SPEC § 七 的具体技术选择。

**断点**：直接用 Tailwind 默认 `sm` (640px) / `md` (768px)。不引入自定义断点，降低心智负担。

**侧边栏（核心改动）**：

- DOM 始终渲染一份，不做条件 mount 以避免动画割裂
- 容器类：`fixed inset-y-0 left-0 z-40 md:static md:translate-x-0 transition-transform`
- 移动态展开：`translate-x-0`；收起：`-translate-x-full`
- 状态由 App 组件持有的 `mobileSidebarOpen` 控制，下沉为 prop
- 触发关闭的所有路径：
  1. 遮罩点击
  2. 选中任一会话
  3. 点"新对话"
  4. 点"设置"
  5. Esc 键
  6. 窗口跨过 `md` 阈值（resize listener）

**遮罩**：

```tsx
{mobileOpen && (
  <div
    className="md:hidden fixed inset-0 z-30 bg-ink-900/30"
    onClick={onMobileClose}
  />
)}
```

**对话框全屏化**：

```tsx
<div className="dialog-card w-full sm:max-w-[640px] h-full sm:h-auto rounded-none sm:rounded-3xl">
```

`SettingsDialog` 与 `SystemPromptDialog` 都用同一套规则。

**顶栏汉堡**：

- 仅 `< md` 渲染（`md:hidden`），点击调用 App 暴露的 `onOpenSidebar`
- 用 `lucide-react` 的 `Menu` 图标，36×36 触摸热区

**何时不写 JS、只用 CSS**：尽量用 Tailwind responsive 前缀 (`md:hidden` / `md:flex` / `text-[40px] md:text-[56px]`) 处理静态差异。只有侧边栏抽屉与遮罩这种需要交互的，才走 React state。
