/**
 * Hearth · 独立 Node 服务
 *
 * 同时提供两个职责：
 *   1. 静态托管 dist/（含 SPA fallback）
 *   2. /api/llm/* 代理到 X-LLM-Base-URL 指定的上游
 *
 * 用纯 Node http + fetch + web streams，零外部依赖。
 * 仅需 Node 20+。
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(ROOT, process.env.DIST_DIR || './dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json; charset=utf-8',
};

const STRIP_REQUEST = new Set(['host', 'x-llm-base-url', 'content-length', 'connection']);
const STRIP_RESPONSE = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/api/llm/')) {
      await handleLlmProxy(req, res);
    } else {
      await handleStatic(req, res);
    }
  } catch (err) {
    console.error('[handler error]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
    }
    res.end(JSON.stringify({ error: { message: String(err?.message ?? err) } }));
  }
});

async function handleLlmProxy(req, res) {
  const baseURL = String(req.headers['x-llm-base-url'] || '').replace(/\/+$/, '');
  if (!baseURL) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: '缺少 X-LLM-Base-URL header' } }));
    return;
  }

  // req.url 形如 /api/llm/chat/completions?foo=bar
  const subpath = req.url.replace(/^\/api\/llm/, '');
  const target = baseURL + subpath;

  const fwdHeaders = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    const lower = k.toLowerCase();
    if (STRIP_REQUEST.has(lower)) continue;
    if (lower.startsWith('x-forwarded-') || lower === 'x-real-ip') continue;
    if (typeof v === 'string') fwdHeaders.set(k, v);
  }

  // 读取上行 body
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  const upstream = await fetch(target, {
    method: req.method,
    headers: fwdHeaders,
    body,
  });

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (STRIP_RESPONSE.has(key.toLowerCase())) return;
    res.setHeader(key, value);
  });
  // 立刻把头送出去，避免 Node 默认缓冲打断 SSE
  res.flushHeaders?.();

  if (upstream.body) {
    Readable.fromWeb(upstream.body).pipe(res);
  } else {
    res.end();
  }
}

async function handleStatic(req, res) {
  // 防目录穿越
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(DIST, requested);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }

  let target = filePath;
  if (!existsSync(target) || (await fs.stat(target)).isDirectory()) {
    // SPA fallback
    target = path.join(DIST, 'index.html');
  }
  if (!existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(target).pipe(res);
}

server.listen(PORT, () => {
  console.log(`Hearth listening on http://0.0.0.0:${PORT}  (DIST=${DIST})`);
});
