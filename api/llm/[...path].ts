/**
 * Vercel Edge Function：生产环境的 LLM 反向代理。
 *
 * 协议跟 vite.config.ts 里的 dev 中间件保持一致：
 *   - 前端请求 /api/llm/<sub>，带 X-LLM-Base-URL 头
 *   - 这里把请求转发到 ${baseURL}<sub>，流式响应原样回传
 *
 * 结果：前端在 dev / prod 都走同一条 /api/llm/* 路径，绕开浏览器 CORS。
 */

export const config = { runtime: 'edge' };

const STRIP_REQUEST = new Set([
  'host',
  'x-llm-base-url',
  'content-length',
  'connection',
]);

const STRIP_RESPONSE = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

export default async function handler(req: Request): Promise<Response> {
  const baseURL = req.headers.get('x-llm-base-url')?.replace(/\/+$/, '');
  if (!baseURL) {
    return jsonError(400, '缺少 X-LLM-Base-URL header');
  }

  const url = new URL(req.url);
  const subpath = url.pathname.replace(/^\/api\/llm/, '');
  const target = baseURL + subpath + url.search;

  const fwdHeaders = new Headers();
  for (const [k, v] of req.headers.entries()) {
    const lower = k.toLowerCase();
    if (STRIP_REQUEST.has(lower)) continue;
    // Vercel 注入的内部头，转发给上游会导致 422/拒绝
    if (lower.startsWith('x-vercel-') || lower.startsWith('x-forwarded-') || lower === 'x-real-ip') {
      continue;
    }
    fwdHeaders.set(k, v);
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      // @ts-expect-error - duplex 是流式请求体必需的，TS lib 类型还没收录
      duplex: 'half',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (STRIP_RESPONSE.has(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });

    // 关键：把 upstream.body 直接传给 Response 构造器，保留 SSE 流式
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return jsonError(502, `上游错误：${(err as Error).message}`);
  }
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
