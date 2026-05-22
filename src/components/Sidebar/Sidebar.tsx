import { useMemo, useState } from 'react';
import { MoreHorizontal, Plus, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Conversation } from '@/types';

const DOT_COLORS = ['#FF7A45', '#7C8B5C', '#5089B5', '#D14343', '#C2C99E', '#FFB69A', '#3B3F4A'];

function dotFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length];
}

function groupByTime(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const groups: Record<string, Conversation[]> = {
    今天: [],
    本周: [],
    更早: [],
  };
  for (const c of convs) {
    if (c.updatedAt >= startOfToday.getTime()) groups['今天'].push(c);
    else if (now - c.updatedAt < 7 * dayMs) groups['本周'].push(c);
    else groups['更早'].push(c);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

interface SidebarProps {
  onOpenSettings: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ onOpenSettings, mobileOpen, onMobileClose }: SidebarProps) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const createConversation = useChatStore((s) => s.createConversation);
  const setActive = useChatStore((s) => s.setActive);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const model = useSettingsStore((s) => s.model);
  const isConfigured = useSettingsStore((s) => s.isConfigured());

  const grouped = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    return groupByTime(sorted);
  }, [conversations]);

  return (
    <>
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-ink-900/30 backdrop-blur-[2px] animate-fade-in"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'w-[260px] flex-none flex flex-col bg-paper-100/95 md:bg-paper-100/70 border-r border-paper-300/60 backdrop-blur-[2px]',
          'fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out shadow-lift md:shadow-none',
          'md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      {/* Brand */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className="brand-mark" />
        <div>
          <div className="font-display text-[18px] leading-none tracking-tight-display">Hearth</div>
          <div className="text-[11px] text-ink-500 tracking-wider-meta uppercase mt-1">
            your assistant
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => {
            createConversation();
            onMobileClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-ink-900 text-paper-50 hover:bg-ink-700 transition-colors shadow-soft"
        >
          <span className="flex items-center gap-2">
            <Plus size={14} strokeWidth={2.2} />
            <span className="text-sm font-medium">新对话</span>
          </span>
          <span className="kbd !bg-ink-700 !text-ink-300 !border-ink-700">⌘K</span>
        </button>
      </div>

      <div className="px-3 mt-1 flex-1 overflow-y-auto nice-scroll">
        {grouped.length === 0 ? (
          <EmptySidebar />
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <div className="text-[11px] text-ink-500 tracking-wider-meta uppercase px-3 mb-2 mt-1">
                {label}
              </div>
              {items.map((c) => (
                <ConversationItem
                  key={c.id}
                  conv={c}
                  active={c.id === activeId}
                  onClick={() => {
                    setActive(c.id);
                    onMobileClose();
                  }}
                  onDelete={() => {
                    if (confirm(`删除「${c.title}」？此操作不可恢复。`)) {
                      deleteConversation(c.id);
                    }
                  }}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-3 border-t border-paper-300/50">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-paper-200/60 transition-colors"
        >
          <SettingsIcon size={16} strokeWidth={1.8} />
          <span className="text-[13.5px]">设置</span>
          <span
            className={cn(
              'ml-auto text-[11px]',
              isConfigured ? 'text-ink-500' : 'text-rose-500'
            )}
          >
            {isConfigured ? model || '已配置' : '未配置'}
          </span>
        </button>
      </div>
      </aside>
    </>
  );
}

function EmptySidebar() {
  return (
    <div className="text-center max-w-[180px] py-10 mx-auto">
      <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-paper-200/70 grid place-items-center text-ink-500">
        <MoreHorizontal size={18} />
      </div>
      <p className="text-[12.5px] text-ink-500 leading-relaxed">
        还没有对话。
        <br />
        点上面"新对话"开始 →
      </p>
    </div>
  );
}

interface ItemProps {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function ConversationItem({ conv, active, onClick, onDelete }: ItemProps) {
  const [hover, setHover] = useState(false);
  const preview = conv.messages.find((m) => m.role === 'user')?.content?.slice(0, 30);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'group relative rounded-lg mb-1 transition-colors',
        active ? 'conv-active' : 'hover:bg-paper-200/60'
      )}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2.5"
      >
        <span className="conv-dot" style={{ background: dotFor(conv.id) }} />
        <span className="flex-1 min-w-0">
          <div className={cn('text-[13.5px] truncate', active && 'font-medium')}>
            {conv.title}
          </div>
          {preview && (
            <div className="text-[11px] text-ink-500 truncate mt-0.5">{preview}</div>
          )}
        </span>
      </button>
      {hover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-500 hover:text-rose-500 hover:bg-paper-200 transition-colors"
          title="删除"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
