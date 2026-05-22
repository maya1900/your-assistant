import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message } from '@/types';
import { newId } from '@/lib/id';

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;

  // selectors
  getActive: () => Conversation | undefined;

  // conversation actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  setActive: (id: string) => void;
  clearActiveMessages: () => void;
  clearAllConversations: () => void;
  setSystemPrompt: (id: string, prompt: string | undefined) => void;

  // message actions
  appendMessage: (convId: string, msg: Message) => void;
  updateMessage: (convId: string, msgId: string, patch: Partial<Message>) => void;
  deleteMessage: (convId: string, msgId: string) => void;
  truncateAfter: (convId: string, msgId: string) => void;
}

function makeConversation(): Conversation {
  const now = Date.now();
  return {
    id: newId(),
    title: '新对话',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,

      getActive: () => {
        const { conversations, activeId } = get();
        return conversations.find((c) => c.id === activeId);
      },

      createConversation: () => {
        const conv = makeConversation();
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeId: conv.id,
        }));
        return conv.id;
      },

      deleteConversation: (id) => {
        set((s) => {
          const next = s.conversations.filter((c) => c.id !== id);
          let activeId = s.activeId;
          if (activeId === id) {
            activeId = next[0]?.id ?? null;
          }
          return { conversations: next, activeId };
        });
      },

      renameConversation: (id, title) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title: title || '新对话', updatedAt: Date.now() } : c
          ),
        }));
      },

      setActive: (id) => set({ activeId: id }),

      clearActiveMessages: () => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId ? { ...c, messages: [], updatedAt: Date.now() } : c
          ),
        }));
      },

      clearAllConversations: () => set({ conversations: [], activeId: null }),

      setSystemPrompt: (id, prompt) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, systemPrompt: prompt, updatedAt: Date.now() } : c
          ),
        }));
      },

      appendMessage: (convId, msg) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            const messages = [...c.messages, msg];
            // 自动生成标题：第一条 user 消息触发
            let title = c.title;
            if (
              (title === '新对话' || !title) &&
              msg.role === 'user' &&
              messages.filter((m) => m.role === 'user').length === 1
            ) {
              title = msg.content.slice(0, 20).trim() || '新对话';
            }
            return { ...c, messages, title, updatedAt: Date.now() };
          }),
        }));
      },

      updateMessage: (convId, msgId, patch) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteMessage: (convId, msgId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.filter((m) => m.id !== msgId), updatedAt: Date.now() }
              : c
          ),
        }));
      },

      truncateAfter: (convId, msgId) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== convId) return c;
            const idx = c.messages.findIndex((m) => m.id === msgId);
            if (idx < 0) return c;
            return {
              ...c,
              messages: c.messages.slice(0, idx + 1),
              updatedAt: Date.now(),
            };
          }),
        }));
      },
    }),
    {
      name: 'hearth.chat.v1',
      partialize: (s) => ({ conversations: s.conversations, activeId: s.activeId }),
    }
  )
);
