/**
 * Vercel Edge Function：生产环境的 LLM 反向代理。
 *
 * 路由触达：vercel.json 的 rewrite 把 /api/llm/<sub> 改写为
 * /api/llm-proxy?path=<sub>，所以这里从 ?path 拿原始子路径。
 *
 * 协议跟 vite.config.ts 里的 dev 中间件保持一致：读 X-LLM-Base-URL 头
 * 决定转发目标，流式响应原样回传。
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
  const subpath = url.searchParams.get('path') || '';
  if (!subpath) {
    return jsonError(400, '缺少 path 参数（vercel.json rewrite 配置应该填充它）');
  }
  const target = `${baseURL}/${subpath}`;

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
