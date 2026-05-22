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
 * 返回针对 /chat/completions 的 URL 和 headers。
 * Dev 走 Vite 动态代理绕开浏览器 CORS；prod 直连（部署侧自行处理跨域）。
 */
function buildEndpoint(baseURL: string, apiKey: string) {
  const cleanedBase = baseURL.replace(/\/+$/, '');
  const isDev = import.meta.env.DEV;
  const url = isDev ? '/api/llm/chat/completions' : `${cleanedBase}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (isDev) headers['X-LLM-Base-URL'] = cleanedBase;
  return { url, headers };
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message || JSON.stringify(data);
  } catch {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}

/**
 * Calls an OpenAI-compatible /chat/completions endpoint with stream=true.
 * Parses SSE on the fly and dispatches token-level deltas.
 */
export async function streamChat(req: StreamRequest): Promise<void> {
  const { baseURL, apiKey, model, temperature, messages, signal, onDelta, onDone, onError } = req;

  const { url, headers } = buildEndpoint(baseURL, apiKey);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal,
      headers,
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
    const detail = await readErrorDetail(response);
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

/* ───────────────────────────── 连通性测试 ───────────────────────────── */

export interface TestConnectionRequest {
  baseURL: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}

export interface TestConnectionResult {
  ok: boolean;
  latencyMs: number;
  reply?: string;
  error?: string;
}

/**
 * 发一条最小成本的非流式 ping，用来验证 Base URL / Key / Model 三者
 * 是否齐活，并报告延迟。
 */
export async function testConnection(req: TestConnectionRequest): Promise<TestConnectionResult> {
  const { baseURL, apiKey, model, signal } = req;
  const { url, headers } = buildEndpoint(baseURL, apiKey);

  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
        stream: false,
      }),
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      return {
        ok: false,
        latencyMs,
        error: `${response.status} ${response.statusText}${detail ? ' · ' + detail : ''}`,
      };
    }

    const data = await response.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content;
    return { ok: true, latencyMs, reply };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    if ((err as Error).name === 'AbortError') {
      return { ok: false, latencyMs, error: '已取消' };
    }
    return { ok: false, latencyMs, error: `网络错误：${(err as Error).message}` };
  }
}
