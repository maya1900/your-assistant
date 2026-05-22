import type { Role } from '@/types';

export interface StreamMessage {
  role: Role;
  content: string;
}

export interface StreamRequest {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  messages: StreamMessage[];
  signal: AbortSignal;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * Calls an OpenAI-compatible /chat/completions endpoint with stream=true.
 * Parses SSE on the fly and dispatches token-level deltas.
 */
export async function streamChat(req: StreamRequest): Promise<void> {
  const { baseURL, apiKey, model, temperature, messages, signal, onDelta, onDone, onError } = req;

  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        stream: true,
        messages,
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    onError(new Error(`网络错误：${(err as Error).message}`));
    return;
  }

  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data?.error?.message || JSON.stringify(data);
    } catch {
      try {
        detail = await response.text();
      } catch {
        /* ignore */
      }
    }
    onError(new Error(`${response.status} ${response.statusText}${detail ? ` · ${detail}` : ''}`));
    return;
  }

  if (!response.body) {
    onError(new Error('响应没有 body'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 事件按 "\n\n" 分隔
      let nl: number;
      while ((nl = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);

        // 一个 event 可能有多行 data:
        const lines = rawEvent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') {
            onDone();
            return;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              onDelta(delta);
            }
          } catch {
            // 部分服务可能产生空 keep-alive 或非 JSON 行，跳过
          }
        }
      }
    }
    onDone();
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    onError(err as Error);
  }
}
