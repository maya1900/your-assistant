# 产品需求 SPEC

## 一、产品定位

一个跑在浏览器里的本地优先 AI 聊天助手。所有对话数据 + 用户配置都存在 LocalStorage，无后端服务。视觉风格定位为**明亮活泼**（圆润卡片、柔和渐变、彩色强调）。

## 二、功能清单

### 2.1 核心功能（P0）

| # | 功能 | 描述 |
|---|------|------|
| F1 | 多会话管理 | 左侧会话列表，可新建 / 切换 / 重命名 / 删除会话，每个会话独立持久化 |
| F2 | 多轮对话 | 每次请求把当前会话完整 `messages` 数组发给模型，保证上下文连贯 |
| F3 | 流式输出 | SSE 流式接收，AI 回复逐 token 显示 |
| F4 | LocalStorage 持久化 | 会话列表、消息内容、设置项全部本地持久化，刷新不丢失 |
| F5 | 清空对话 | 单会话内"清空消息"按钮；以及"清空全部会话"危险操作 |
| F6 | Markdown 渲染 | AI 回复以 Markdown 渲染，支持代码块语法高亮 + 一键复制 |
| F7 | 模型设置面板 | 用户配置 Base URL / Model / API Key / temperature |

### 2.2 高阶功能（P1）

| # | 功能 | 描述 |
|---|------|------|
| F8 | 中断生成 | 流式过程中显示 Stop 按钮，点击后用 `AbortController` 取消，保留已生成内容 |
| F9 | 重新生成 | AI 消息下方"重新生成"按钮，丢弃当前回复重发上一轮 user 消息 |
| F10 | 编辑提问 | 用户消息可编辑，编辑后丢弃此条之后所有消息并重新发送 |
| F11 | 导出对话 | 单会话导出为 Markdown 或 JSON 文件 |
| F12 | 自定义 System Prompt | 每个会话可设置独立系统提示词，缺省值在全局设置 |

### 2.3 非功能性需求

- **响应**：首字节延迟 ≤ API 自身延迟 + 100ms 框架开销
- **键盘**：`Enter` 发送、`Shift+Enter` 换行、`Cmd/Ctrl + K` 新建会话
- **可用性**：API Key 未配置时，发送按钮 disabled 并提示"请先在设置中配置 API Key"
- **错误**：网络错误 / 4xx / 5xx 在消息气泡内以红色错误态展示，可点击重试

## 三、数据模型

```typescript
type Role = 'system' | 'user' | 'assistant';

interface Message {
  id: string;              // nanoid
  role: Role;
  content: string;
  createdAt: number;       // Date.now()
  // 流式过程中标记
  status?: 'streaming' | 'done' | 'error' | 'aborted';
  error?: string;
}

interface Conversation {
  id: string;
  title: string;           // 缺省"新对话"，首条 user 消息后自动取前 20 字符
  systemPrompt?: string;   // 会话级 system prompt，缺省走全局
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface Settings {
  baseURL: string;         // 例如 https://api.deepseek.com/v1
  apiKey: string;
  model: string;           // 例如 deepseek-chat
  temperature: number;     // 0~2，默认 0.7
  defaultSystemPrompt: string;
}
```

## 四、交互流程

### 4.1 发送消息

1. 用户在输入框写文字 → 回车
2. 创建一条 `role=user` 消息塞进当前会话
3. 创建一条 `role=assistant, status=streaming, content=''` 占位消息
4. 拼装 request body：`[systemPrompt?, ...messages]`，调用模型 API（`stream: true`）
5. SSE 数据到达，逐 chunk 追加到 assistant 消息的 `content`，触发 UI 重渲染
6. 收到 `[DONE]` 或流结束，把 status 改为 `done`，持久化
7. 全程通过 `AbortController` 控制可中断；中断时 status = `aborted`

### 4.2 会话标题自动生成

第一条 user 消息发完后，把它的前 20 字符设为 `conversation.title`。

### 4.3 清空 vs 删除

- **清空当前会话**：保留会话条目，messages 清零
- **删除会话**：会话条目从列表移除；若被删的是 active 会话，自动切到列表第一个或创建新空会话

## 五、UI 结构

```
+----------------------------------------------------------+
|  Sidebar         |  Topbar (title · system prompt · ⚙)   |
|  ─────────       +--------------------------------------+
|  [+ 新对话]      |                                       |
|  · 会话 A (active)|         Message List                  |
|  · 会话 B        |         (user / assistant 气泡)        |
|  · 会话 C        |                                       |
|                  +--------------------------------------+
|  ⚙ 设置          |  [输入框 ………………………… 发送]            |
+----------------------------------------------------------+
```

- 左侧栏宽 260px，可折叠
- 消息区最大宽 768px 居中
- 用户气泡右对齐（彩色），AI 气泡左对齐（白卡）
- 流式过程中 AI 气泡末尾有跳动光标 `▍`

## 六、不在本期范围

- 用户登录 / 云端同步
- 图片 / 文件上传（多模态）
- 函数调用 / Tool Use
- LaTeX 公式 / Mermaid（已显式排除）
- 移动端深度适配（基本响应式即可，不做完整 mobile-first）
