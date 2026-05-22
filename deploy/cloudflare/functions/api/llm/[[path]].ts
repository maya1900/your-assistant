/**
 * Cloudflare Pages Function: 生产环境的 LLM 反向代理。
 *
 * 文件路径 functions/api/llm/[[path]].ts 触达 /api/llm/* (双方括号 = catch-all)。
 * 协议跟 vite.config.ts 里的 dev 中间件保持一致：
 *   - 前端请求 /api/llm/<sub>，带 X-LLM-Base-URL 头
 *   - 这里把请求转发到 ${baseURL}<sub>，流式响应原样回传
 *
 * 部署：Cloudflare Pages 自动识别 functions/ 目录，无需额外配置。
 */

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

export const onRequest = async ({
  request,
}: {
  request: Request;
}): Promise<Response> => {
  const baseURL = request.headers.get('x-llm-base-url')?.replace(/\/+$/, '');
  if (!baseURL) {
    return jsonError(400, '缺少 X-LLM-Base-URL header');
  }

  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/llm/, '');
  const target = baseURL + subpath + url.search;

  const fwdHeaders = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (STRIP_REQUEST.has(lower)) continue;
    if (lower.startsWith('cf-') || lower.startsWith('x-forwarded-') || lower === 'x-real-ip') {
      continue;
    }
    fwdHeaders.set(k, v);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: fwdHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      // @ts-expect-error - duplex 流式请求体必需
      duplex: 'half',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (STRIP_RESPONSE.has(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return jsonError(502, `上游错误：${(err as Error).message}`);
  }
};

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
