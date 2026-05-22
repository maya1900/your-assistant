import { useCallback, useRef, useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { streamChat, type StreamMessage } from '@/services/llmClient';
import { newId } from '@/lib/id';
import type { Message } from '@/types';

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runStream = useCallback(async (convId: string, assistantMsgId: string) => {
    const settings = useSettingsStore.getState();
    const chat = useChatStore.getState();
    const conv = chat.conversations.find((c) => c.id === convId);
    if (!conv) return;

    // 组装上下文：system prompt 优先用会话级，否则用全局默认；空则不发
    const sys = conv.systemPrompt ?? settings.defaultSystemPrompt;
    const history: StreamMessage[] = conv.messages
      .filter((m) => m.id !== assistantMsgId && m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const messages: StreamMessage[] = sys
      ? [{ role: 'system', content: sys }, ...history]
      : history;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    let accumulated = '';
    let lastFlush = 0;
    const flush = (force = false) => {
      const now = performance.now();
      if (force || now - lastFlush > 30) {
        lastFlush = now;
        useChatStore.getState().updateMessage(convId, assistantMsgId, {
          content: accumulated,
          status: 'streaming',
        });
      }
    };

    await streamChat({
      baseURL: settings.baseURL,
      apiKey: settings.apiKey,
      model: settings.model,
      temperature: settings.temperature,
      messages,
      signal: controller.signal,
      onDelta: (chunk) => {
        accumulated += chunk;
        flush();
      },
      onDone: () => {
        useChatStore.getState().updateMessage(convId, assistantMsgId, {
          content: accumulated,
          status: 'done',
        });
      },
      onError: (err) => {
        useChatStore.getState().updateMessage(convId, assistantMsgId, {
          content: accumulated,
          status: 'error',
          error: err.message,
        });
      },
    });

    // 用户中断时 fetch 不会触发 onDone/onError；显式标记 aborted
    if (controller.signal.aborted) {
      useChatStore.getState().updateMessage(convId, assistantMsgId, {
        content: accumulated,
        status: 'aborted',
      });
    }

    setIsStreaming(false);
    abortRef.current = null;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const chat = useChatStore.getState();
      let convId = chat.activeId;
      if (!convId) {
        convId = chat.createConversation();
      }

      const userMsg: Message = {
        id: newId(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        status: 'done',
      };
      const assistantMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      };

      chat.appendMessage(convId, userMsg);
      chat.appendMessage(convId, assistantMsg);

      await runStream(convId, assistantMsg.id);
    },
    [runStream]
  );

  const regenerate = useCallback(async () => {
    const chat = useChatStore.getState();
    const conv = chat.getActive();
    if (!conv) return;

    // 找到最后一条 assistant 消息，把它换成新的占位
    const lastAssistantIdx = [...conv.messages].reverse().findIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx < 0) return;
    const idx = conv.messages.length - 1 - lastAssistantIdx;
    const oldMsg = conv.messages[idx];

    chat.updateMessage(conv.id, oldMsg.id, {
      content: '',
      status: 'streaming',
      error: undefined,
    });

    await runStream(conv.id, oldMsg.id);
  }, [runStream]);

  const editAndResend = useCallback(
    async (userMsgId: string, newContent: string) => {
      const chat = useChatStore.getState();
      const conv = chat.getActive();
      if (!conv) return;
      chat.updateMessage(conv.id, userMsgId, { content: newContent.trim() });
      chat.truncateAfter(conv.id, userMsgId);

      const assistantMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      };
      chat.appendMessage(conv.id, assistantMsg);
      await runStream(conv.id, assistantMsg.id);
    },
    [runStream]
  );

  return { isStreaming, send, stop, regenerate, editAndResend };
}
