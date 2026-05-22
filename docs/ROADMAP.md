# 实现路线 ROADMAP

按以下顺序推进，每一步完成后即可独立运行/验证。

## 阶段 0 - UI 设计稿（frontend-design）

调用 `frontend-design` skill 产出一个静态可交互的 UI 原型，明确：

- 配色方案（明亮活泼）
- 字体层级
- 关键组件视觉（侧边栏 / 气泡 / 代码块 / 输入框 / 设置弹窗）
- 空状态 & 流式状态

产物：`design/` 目录下的静态 HTML/CSS 参考，后续 React 组件按这个还原。

## 阶段 1 - 项目初始化

- `npm create vite@latest . -- --template react-ts`
- 装依赖：`tailwindcss postcss autoprefixer zustand nanoid react-markdown remark-gfm react-syntax-highlighter clsx tailwind-merge lucide-react`
- 装类型：`@types/react-syntax-highlighter`
- 配置 Tailwind（`tailwind.config.js` + `index.css` 注入 `@tailwind` 指令）
- 跑通 `npm run dev`，看到默认页

## 阶段 2 - 类型 & 数据层

- `src/types/index.ts`：Message / Conversation / Settings
- `src/lib/id.ts`：nanoid 封装
- `src/store/useChatStore.ts`：会话状态 + persist
- `src/store/useSettingsStore.ts`：设置 + persist

**自测**：在 React DevTools 里手动 dispatch 几个 action，看 LocalStorage 是否正确写入；刷新页面状态恢复。

## 阶段 3 - LLM 客户端

- `src/services/llmClient.ts`：`streamChat()` 实现
- 用 mock SSE 端点（或一个 setTimeout 模拟的 ReadableStream）跑通流式
- 验证 AbortController 能正确中断

## 阶段 4 - 基础布局

- `App.tsx` 总框架：Sidebar + 主区
- `Sidebar.tsx` 会话列表骨架
- `ChatView.tsx` 头部 + 消息区 + 输入框
- Tailwind 还原阶段 0 的设计稿

## 阶段 5 - 消息渲染与流式 hook

- `MessageBubble.tsx` 用户/AI 两种样式
- `useStreamingChat.ts` 串起：send → store.append → llmClient.stream → updateMessage
- 末尾跳动光标
- 错误态气泡

## 阶段 6 - Markdown 渲染

- `MarkdownRenderer.tsx`：react-markdown + remark-gfm
- `CodeBlock.tsx`：高亮 + 复制按钮
- 行内 code 单独样式

## 阶段 7 - 设置面板

- `SettingsDialog.tsx`：模态框
- 字段：Base URL / Model / API Key (type=password) / Temperature / 默认 System Prompt
- 保存即触发 useSettingsStore 更新

## 阶段 8 - 高阶交互

- Stop 按钮（流式时显示在输入框位置）
- 用户消息编辑（点击进入 textarea，保存后 truncateAfter + 重发）
- AI 消息"重新生成"
- 导出 Markdown / JSON（lib/exporters.ts）
- 会话级 System Prompt 编辑

## 阶段 9 - 打磨与验证

- 键盘快捷键：Enter / Shift+Enter / Cmd+K
- 空状态文案
- 加载态 / 错误态视觉打磨
- 用 `run` skill 启动项目，浏览器实际跑一遍核心链路
- 对照 SPEC.md F1~F12 逐项验收

## 阶段 10 - 移动端适配（F14）

按 [SPEC § 七](SPEC.md) 与 [ARCHITECTURE § 十](ARCHITECTURE.md) 的方案落地：

- `App.tsx` 持有 `mobileSidebarOpen` 状态，向下传 `onOpen` / `onClose`
- `Sidebar.tsx`：增加抽屉容器类，绑定关闭路径（遮罩/会话点击/新建/设置/Esc/resize 过阈值）
- `ChatView.tsx`：顶栏左侧 `< md` 显示汉堡按钮；动作按钮在 `< sm` 时收起文字标签
- `SettingsDialog.tsx` + `SystemPromptDialog.tsx`：`< sm` 时占满视口，无圆角
- `ChatInput.tsx`：底部右侧的 Enter/⇧↵ kbd 提示 `< md` 隐藏
- `EmptyState.tsx`：主标题 `text-[40px] md:text-[56px]`

## 验收清单

- [x] F1 多会话 CRUD
- [x] F2 多轮上下文
- [x] F3 流式逐字
- [x] F4 刷新不丢
- [x] F5 清空对话
- [x] F6 Markdown + 代码高亮 + 复制
- [x] F7 设置面板
- [x] F8 Stop 中断
- [x] F9 重新生成
- [x] F10 编辑提问
- [x] F11 导出 MD / JSON
- [x] F12 会话级 System Prompt
- [x] F13 测试连接
- [x] F14 移动端适配（抽屉式侧边栏 + 对话框全屏 + 标题栏紧凑）

## 已发布后续

按时间线列出上线后新加的内容。详情见 [SPEC.md](SPEC.md) 与 [ARCHITECTURE.md](ARCHITECTURE.md)。

| Commit | 类型 | 说明 |
|---|---|---|
| `e41f94d` | fix | Vite dev 动态代理，按 `X-LLM-Base-URL` 头转发，绕开浏览器直连 LLM 的 CORS 拦截 |
| `3e28ce8` | feat | 设置面板新增"测试连接"按钮 (F13)：非流式 ping，报告延迟与上游错误 |
| `0d1cd33` | fix | 输入框底部工具栏右内边距改为 `pr-14`，避让绝对定位的发送按钮 |
