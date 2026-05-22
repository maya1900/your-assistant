import type { Conversation } from '@/types';

export function toMarkdown(conv: Conversation): string {
  const lines: string[] = [];
  lines.push(`# ${conv.title}`);
  lines.push('');
  lines.push(`> 导出时间：${new Date().toLocaleString()}`);
  if (conv.systemPrompt) {
    lines.push('');
    lines.push(`**System Prompt**：${conv.systemPrompt}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const m of conv.messages) {
    if (m.role === 'system') continue;
    lines.push(`### ${m.role === 'user' ? '🧑 我' : '🌅 Hearth'}`);
    lines.push('');
    lines.push(m.content || '_（空）_');
    lines.push('');
  }
  return lines.join('\n');
}

export function toJSON(conv: Conversation): string {
  return JSON.stringify(conv, null, 2);
}

export function download(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(s: string) {
  return (
    s
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'conversation'
  );
}

export function exportConversation(conv: Conversation, format: 'md' | 'json') {
  const base = slugify(conv.title);
  if (format === 'md') {
    download(`${base}.md`, toMarkdown(conv), 'text/markdown');
  } else {
    download(`${base}.json`, toJSON(conv), 'application/json');
  }
}
