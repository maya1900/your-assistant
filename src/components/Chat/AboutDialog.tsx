import { useEffect } from 'react';
import { Bug, ExternalLink, FileText, Github, X } from 'lucide-react';
import { version as VERSION } from '../../../package.json';

export const REPO_URL = 'https://github.com/maya1900/your-assistant';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 dialog-backdrop sm:grid sm:place-items-center sm:px-6"
      onClick={onClose}
    >
      <div
        className="dialog-card w-full sm:max-w-[480px] h-dvh sm:h-auto rounded-none sm:rounded-3xl overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-3 flex items-start gap-4 flex-none">
          <div className="brand-mark mt-1" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[22px] sm:text-[26px] leading-tight tracking-tight-display">
              Hearth
            </h2>
            <p className="text-[12.5px] text-ink-500 mt-0.5">your assistant · v{VERSION}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-paper-200/60 grid place-items-center text-ink-500 hover:text-ink-900 transition-colors flex-none"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="hairline mx-5 sm:mx-7" />

        {/* Body */}
        <div className="px-5 sm:px-7 py-5 space-y-4 flex-1 min-h-0 overflow-y-auto nice-scroll">
          <p className="text-[13.5px] text-ink-700 leading-relaxed">
            一个本地优先的 AI 聊天助手，跑在浏览器里。对接任意兼容 OpenAI Chat Completions
            协议的模型服务。所有对话与配置都保存在你的 LocalStorage，无后端，无遥测。
          </p>

          <div className="rounded-2xl border border-paper-300/60 bg-paper-50 overflow-hidden">
            <LinkRow
              href={REPO_URL}
              icon={<Github size={16} />}
              title="GitHub 仓库"
              subtitle={REPO_URL.replace('https://', '')}
            />
            <div className="hairline mx-4" />
            <LinkRow
              href={`${REPO_URL}/issues/new`}
              icon={<Bug size={16} />}
              title="提 Issue · 反馈或建议"
              subtitle="发现 bug、提需求、提改进想法"
            />
            <div className="hairline mx-4" />
            <LinkRow
              href={`${REPO_URL}/blob/master/LICENSE`}
              icon={<FileText size={16} />}
              title="MIT License"
              subtitle="自由使用、修改、再分发"
            />
          </div>

          <p className="text-[11px] text-ink-500 text-center pt-2">Made by maya1900 · 2026</p>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 bg-paper-100/60 border-t border-paper-300/50 flex items-center justify-end gap-2 flex-none">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-white bg-ink-900 hover:bg-ink-700 rounded-lg transition-colors shadow-soft"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 px-4 py-3 hover:bg-paper-100 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-paper-200 grid place-items-center text-ink-700 group-hover:bg-accent-100 group-hover:text-accent-600 transition-colors flex-none">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="text-[11.5px] text-ink-500 truncate">{subtitle}</div>
      </div>
      <ExternalLink size={13} className="text-ink-500 group-hover:text-ink-900 flex-none transition-colors" />
    </a>
  );
}
