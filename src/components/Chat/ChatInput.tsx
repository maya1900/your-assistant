import { useRef, useEffect } from 'react';
import { Send, Square, Thermometer } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useChatStore } from '@/store/useChatStore';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  onOpenSettings: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  onOpenSettings,
}: Props) {
  const isConfigured = useSettingsStore((s) => s.isConfigured());
  const temperature = useSettingsStore((s) => s.temperature);
  const messageCount = useChatStore(
    (s) => s.conversations.find((c) => c.id === s.activeId)?.messages.length ?? 0
  );
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const canSend = !isStreaming && isConfigured && value.trim().length > 0;

  return (
    <div className="flex-none px-6 pb-6 pt-2 bg-gradient-to-t from-paper-50 via-paper-50 to-paper-50/0">
      <div className="max-w-[768px] mx-auto">
        {!isConfigured && (
          <button
            onClick={onOpenSettings}
            className="mb-3 w-full text-[12.5px] py-2 px-3 rounded-lg bg-rose-100/60 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-colors"
          >
            还没有配置 API · 点这里打开设置
          </button>
        )}
        <div className="relative bg-paper-card border border-paper-300/80 rounded-2xl shadow-soft transition-shadow focus-within:shadow-lift focus-within:border-accent-300">
          <textarea
            ref={ref}
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder={
              isConfigured ? '问点什么…   Enter 发送 · Shift+Enter 换行' : '配置 API 后开始对话'
            }
            disabled={!isConfigured}
            className="w-full resize-none bg-transparent px-5 py-4 pr-14 text-[14.5px] leading-relaxed placeholder:text-ink-500/70 focus:outline-none disabled:opacity-60"
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              onClick={onStop}
              className="stop-btn absolute right-3 bottom-3 h-10 w-10 rounded-full grid place-items-center"
              title="停止生成"
            >
              <Square size={12} fill="currentColor" strokeWidth={0} />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!canSend}
              className="send-btn absolute right-3 bottom-3 h-10 w-10 rounded-full grid place-items-center"
              title="发送"
            >
              <Send size={16} strokeWidth={2.2} />
            </button>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center gap-2 px-4 pb-3 -mt-1">
            <span className="text-[11.5px] text-ink-500 flex items-center gap-1.5 px-2 py-1">
              上下文 {messageCount} 条
            </span>
            <button
              onClick={onOpenSettings}
              className="text-[11.5px] text-ink-500 hover:text-ink-900 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-paper-100"
            >
              <Thermometer size={12} />
              Temperature {temperature}
            </button>
            <span className="ml-auto text-[11px] text-ink-500/80">
              <span className="kbd">Enter</span> 发送 · <span className="kbd">⇧↵</span> 换行
            </span>
          </div>
        </div>
        <p className="text-center text-[11px] text-ink-500 mt-3">
          所有对话仅保存在你的浏览器本地，刷新或换设备不会同步。
        </p>
      </div>
    </div>
  );
}
