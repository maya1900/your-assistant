import { useState } from 'react';
import { AlertCircle, Check, Copy, Pencil, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';

interface Props {
  message: Message;
  isLastAssistant: boolean;
  canRegenerate: boolean;
  onEditUser: (id: string, newContent: string) => void;
  onRegenerate: () => void;
}

export function MessageBubble({
  message,
  isLastAssistant,
  canRegenerate,
  onEditUser,
  onRegenerate,
}: Props) {
  const isUser = message.role === 'user';
  return isUser ? (
    <UserBubble message={message} onEdit={onEditUser} />
  ) : (
    <AssistantBubble
      message={message}
      isLastAssistant={isLastAssistant}
      canRegenerate={canRegenerate}
      onRegenerate={onRegenerate}
    />
  );
}

/* ─────────────────────────────  USER  ───────────────────────────── */

function UserBubble({
  message,
  onEdit,
}: {
  message: Message;
  onEdit: (id: string, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [hover, setHover] = useState(false);

  if (editing) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[78%] w-full">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onEdit(message.id, draft);
                setEditing(false);
              }
              if (e.key === 'Escape') {
                setEditing(false);
                setDraft(message.content);
              }
            }}
            rows={3}
            className="field-input w-full rounded-bubble rounded-tr-md px-4 py-3 text-[14.5px] leading-relaxed resize-none"
          />
          <div className="flex justify-end gap-1.5 mt-2 text-[12px]">
            <button
              onClick={() => {
                setEditing(false);
                setDraft(message.content);
              }}
              className="px-2.5 py-1 rounded-md text-ink-500 hover:bg-paper-200"
            >
              取消 <span className="kbd ml-1">Esc</span>
            </button>
            <button
              onClick={() => {
                onEdit(message.id, draft);
                setEditing(false);
              }}
              className="px-2.5 py-1 rounded-md font-medium text-white bg-ink-900 hover:bg-ink-700"
            >
              保存并重新生成 <span className="kbd !bg-ink-700 !text-ink-300 !border-ink-700 ml-1">⏎</span>
            </button>
          </div>
        </div>
        <div className="user-avatar">M</div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-start gap-3 justify-end"
    >
      <div className="relative max-w-[78%]">
        {hover && (
          <button
            onClick={() => setEditing(true)}
            className="absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-paper-card border border-paper-300 text-ink-500 hover:text-ink-900 hover:border-accent-300 shadow-soft"
            title="编辑"
          >
            <Pencil size={13} />
          </button>
        )}
        <div className="user-bubble px-4 py-3 rounded-bubble rounded-tr-md whitespace-pre-wrap text-[14.5px] leading-relaxed">
          {message.content}
        </div>
      </div>
      <div className="user-avatar">M</div>
    </div>
  );
}

/* ──────────────────────────  ASSISTANT  ─────────────────────────── */

function AssistantBubble({
  message,
  isLastAssistant,
  canRegenerate,
  onRegenerate,
}: {
  message: Message;
  isLastAssistant: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';
  const isAborted = message.status === 'aborted';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="ai-avatar" />
      <div
        className={cn(
          'ai-bubble max-w-[88%] px-5 py-4 rounded-bubble rounded-tl-md',
          isError && 'border-rose-500/40'
        )}
      >
        {/* Body */}
        {isStreaming && !message.content ? (
          <TypingDots />
        ) : (
          <>
            <MarkdownRenderer>{message.content || ' '}</MarkdownRenderer>
            {isStreaming && <span className="stream-caret align-baseline" />}
          </>
        )}

        {isError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-100/60 border border-rose-100 px-3 py-2 text-[13px] text-rose-500">
            <AlertCircle size={15} className="mt-0.5 flex-none" />
            <div className="flex-1 leading-relaxed">{message.error ?? '生成失败'}</div>
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                className="text-rose-500 hover:underline text-[12.5px] font-medium flex-none"
              >
                重试
              </button>
            )}
          </div>
        )}

        {isAborted && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-500">
            <X size={13} />
            已中断
          </div>
        )}

        {/* Actions */}
        {!isStreaming && message.content && (
          <div className="mt-3 pt-3 border-t border-paper-200/80 flex items-center gap-1 -mx-1 -mb-1">
            <button
              onClick={copy}
              className="px-2 py-1 rounded-md text-[12px] text-ink-500 hover:text-ink-900 hover:bg-paper-100 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? '已复制' : '复制'}
            </button>
            {isLastAssistant && canRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-2 py-1 rounded-md text-[12px] text-ink-500 hover:text-ink-900 hover:bg-paper-100 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                重新生成
              </button>
            )}
            <span className="ml-auto text-[11px] text-ink-300 pr-1">
              {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-2 h-2 rounded-full bg-accent-500 animate-typing-dot" />
      <span
        className="w-2 h-2 rounded-full bg-accent-500 animate-typing-dot"
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-accent-500 animate-typing-dot"
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  );
}
