import { defineConfig, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * 动态 LLM 代理：
 * 前端请求 /api/llm/<path>，并在 header 里带 X-LLM-Base-URL。
 * 这里把请求转发到 ${baseURL}<path>，流式响应原样回传。
 * 仅用于 dev 阶段绕开浏览器 CORS。
 */
const llmProxy: Connect.NextHandleFunction = async (req, res) => {
  const baseURL = (req.headers['x-llm-base-url'] as string | undefined)?.replace(/\/+$/, '');
  if (!baseURL) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: '缺少 X-LLM-Base-URL header' } }));
    return;
  }

  // Vite 已经把 /api/llm 前缀剥掉，req.url 形如 "/chat/completions"
  const targetURL = baseURL + (req.url ?? '');

  // 读取上行 body
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  // 转发 headers，过滤 host / 我们的私有 header / hop-by-hop
  const fwdHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v !== 'string') continue;
    const lower = k.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'x-llm-base-url' ||
      lower === 'content-length' ||
      lower === 'connection'
    ) {
      continue;
    }
    fwdHeaders[k] = v;
  }

  try {
    const upstream = await fetch(targetURL, {
      method: req.method,
      headers: fwdHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // Node 自己管 transfer-encoding / connection；content-encoding 已被 fetch 解开
      if (['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(lower)) {
        return;
      }
      res.setHeader(key, value);
    });
    // 流式输出关键：先把 header flush 出去，再边读边写
    (res as ServerResponse).flushHeaders?.();

    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(
      JSON.stringify({ error: { message: `上游错误：${(err as Error).message}` } })
    );
  }
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'hearth-llm-proxy',
      configureServer(server) {
        server.middlewares.use('/api/llm', llmProxy as (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => void);
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
