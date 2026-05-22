import { useRef, useState } from 'react';
import { Bug, Download, Info, Menu, MoreHorizontal, Trash2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { exportConversation } from '@/lib/exporters';
import { AboutDialog, REPO_URL } from './AboutDialog';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';
import { SystemPromptDialog } from './SystemPromptDialog';

interface Props {
  onOpenSettings: () => void;
  onOpenMobileSidebar: () => void;
}

function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden h-9 w-9 -ml-1.5 rounded-lg text-ink-700 hover:bg-paper-200/60 transition-colors grid place-items-center flex-none"
      title="打开侧边栏"
      aria-label="打开侧边栏"
    >
      <Menu size={18} strokeWidth={1.8} />
    </button>
  );
}

function MoreMenu({ onAbout }: { onAbout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 rounded-lg text-ink-700 hover:bg-paper-200/60 transition-colors grid place-items-center"
        title="更多"
        aria-label="更多操作"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-30 bg-paper-card border border-paper-300 rounded-xl shadow-lift overflow-hidden min-w-[160px]">
            <button
              onClick={() => {
                setOpen(false);
                onAbout();
              }}
              className="w-full text-left text-[13px] px-3 py-2.5 hover:bg-paper-100 flex items-center gap-2.5"
            >
              <Info size={14} className="text-ink-500" />
              关于
            </button>
            <a
              href={`${REPO_URL}/issues/new`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="w-full text-left text-[13px] px-3 py-2.5 hover:bg-paper-100 flex items-center gap-2.5"
            >
              <Bug size={14} className="text-ink-500" />
              反馈 / 提 Issue
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export function ChatView({ onOpenSettings, onOpenMobileSidebar }: Props) {
  const conv = useChatStore((s) => s.getActive());
  const createConversation = useChatStore((s) => s.createConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const clearActiveMessages = useChatStore((s) => s.clearActiveMessages);

  const { isStreaming, send, stop, regenerate, editAndResend } = useStreamingChat();

  const [input, setInput] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const listRef = useAutoScroll<HTMLDivElement>([
    conv?.id,
    conv?.messages.length,
    conv?.messages.at(-1)?.content.length,
  ]);

  /* ─── Empty case: no conversation yet ─── */
  if (!conv) {
    return (
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-14 flex-none flex items-center px-4 md:px-6 border-b border-paper-300/50 bg-paper-50/40 backdrop-blur-md">
          <HamburgerButton onClick={onOpenMobileSidebar} />
          <div className="ml-auto">
            <MoreMenu onAbout={() => setAboutOpen(true)} />
          </div>
        </header>
        <EmptyState
          onPick={(prompt) => {
            createConversation();
            setInput(prompt);
          }}
        />
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={async () => {
            const text = input;
            setInput('');
            await send(text);
          }}
          onStop={stop}
          isStreaming={isStreaming}
          onOpenSettings={onOpenSettings}
        />
        <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      </main>
    );
  }

  const lastAssistantId = [...conv.messages].reverse().find((m) => m.role === 'assistant')?.id;
  const hasMessages = conv.messages.length > 0;
  const hasCustomPrompt = conv.systemPrompt !== undefined;

  return (
    <main className="flex-1 flex flex-col min-w-0 relative">
      {/* Top bar */}
      <header className="h-14 flex-none flex items-center gap-2 sm:gap-3 px-4 md:px-6 border-b border-paper-300/50 bg-paper-50/70 backdrop-blur-md">
        <HamburgerButton onClick={onOpenMobileSidebar} />
        <input
          key={conv.id}
          defaultValue={conv.title}
          spellCheck={false}
          onBlur={(e) => renameConversation(conv.id, e.target.value.trim() || conv.title)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="editable-title font-display text-[18px] tracking-tight-display bg-transparent border-b border-transparent px-1 py-0.5 max-w-[300px] flex-1 min-w-0"
        />

        <button
          onClick={() => setPromptDialogOpen(true)}
          className={
            hasCustomPrompt
              ? 'ml-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider-meta text-sage-700 bg-sage-100/70 border border-sage-300/60 rounded-full px-2.5 py-1 hover:bg-sage-100 flex-none'
              : 'ml-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider-meta text-ink-500 bg-paper-100 border border-paper-300/60 rounded-full px-2.5 py-1 hover:bg-paper-200/60 flex-none'
          }
          title={hasCustomPrompt ? 'System Prompt · 自定义' : 'System Prompt · 默认'}
        >
          <span className="w-[6px] h-[6px] rounded-full bg-current opacity-70" />
          <span className="hidden sm:inline">
            {hasCustomPrompt ? 'System Prompt · 自定义' : 'System Prompt · 默认'}
          </span>
          <span className="sm:hidden">Prompt</span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={!hasMessages}
              className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg text-[12.5px] text-ink-700 hover:bg-paper-200/60 transition-colors flex items-center justify-center sm:gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="导出"
            >
              <Download size={14} />
              <span className="hidden sm:inline">导出</span>
            </button>
            {exportOpen && hasMessages && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-9 z-30 bg-paper-card border border-paper-300 rounded-xl shadow-lift overflow-hidden min-w-[140px]">
                  <button
                    onClick={() => {
                      exportConversation(conv, 'md');
                      setExportOpen(false);
                    }}
                    className="w-full text-left text-[13px] px-3 py-2 hover:bg-paper-100"
                  >
                    导出为 Markdown
                  </button>
                  <button
                    onClick={() => {
                      exportConversation(conv, 'json');
                      setExportOpen(false);
                    }}
                    className="w-full text-left text-[13px] px-3 py-2 hover:bg-paper-100"
                  >
                    导出为 JSON
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            disabled={!hasMessages || isStreaming}
            onClick={() => {
              if (confirm('清空当前对话的所有消息？')) clearActiveMessages();
            }}
            className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg text-[12.5px] text-ink-700 hover:bg-paper-200/60 transition-colors flex items-center justify-center sm:gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="清空"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">清空</span>
          </button>

          <MoreMenu onAbout={() => setAboutOpen(true)} />
        </div>
      </header>

      {/* Message list or empty */}
      {hasMessages ? (
        <div ref={listRef} className="flex-1 overflow-y-auto nice-scroll">
          <div className="max-w-[768px] mx-auto px-4 md:px-6 py-8 space-y-7">
            {conv.messages
              .filter((m) => m.role !== 'system')
              .map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLastAssistant={m.id === lastAssistantId}
                  canRegenerate={!isStreaming}
                  onEditUser={(id, content) => editAndResend(id, content)}
                  onEditAssistant={(id, content) =>
                    useChatStore.getState().updateMessage(conv.id, id, { content })
                  }
                  onRegenerate={regenerate}
                />
              ))}
          </div>
        </div>
      ) : (
        <EmptyState onPick={(prompt) => setInput(prompt)} />
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={async () => {
          const text = input;
          setInput('');
          await send(text);
        }}
        onStop={stop}
        isStreaming={isStreaming}
        onOpenSettings={onOpenSettings}
      />

      <SystemPromptDialog open={promptDialogOpen} onClose={() => setPromptDialogOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
