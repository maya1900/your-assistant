import { useEffect, useState } from 'react';
import { Eye, EyeOff, HelpCircle, Trash2, X } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useChatStore } from '@/store/useChatStore';
import type { Settings } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const settings = useSettingsStore();
  const clearAll = useChatStore((s) => s.clearAllConversations);

  const [draft, setDraft] = useState<Settings>({
    baseURL: settings.baseURL,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    defaultSystemPrompt: settings.defaultSystemPrompt,
  });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft({
        baseURL: settings.baseURL,
        apiKey: settings.apiKey,
        model: settings.model,
        temperature: settings.temperature,
        defaultSystemPrompt: settings.defaultSystemPrompt,
      });
      setShowKey(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tempPct = ((draft.temperature / 2) * 100).toFixed(0);

  return (
    <div
      className="fixed inset-0 z-50 dialog-backdrop grid place-items-center px-6"
      onClick={onClose}
    >
      <div
        className="dialog-card w-full max-w-[640px] rounded-3xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex items-start gap-4">
          <div className="brand-mark mt-1" />
          <div className="flex-1">
            <h2 className="font-display text-[26px] leading-tight tracking-tight-display">设置</h2>
            <p className="text-[13px] text-ink-500 mt-1">
              配置任意兼容 OpenAI Chat Completions 协议的模型服务。Key 只保存在你的浏览器，不会上传。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-paper-200/60 grid place-items-center text-ink-500 hover:text-ink-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="hairline mx-7" />

        {/* Form */}
        <div className="px-7 py-6 space-y-5 max-h-[60vh] overflow-y-auto nice-scroll">
          <div className="grid grid-cols-3 gap-x-5 gap-y-5">
            <Field
              className="col-span-2"
              label="Base URL"
              hint="兼容 OpenAI 协议的服务地址"
            >
              <input
                value={draft.baseURL}
                onChange={(e) => setDraft({ ...draft, baseURL: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
                spellCheck={false}
                className="field-input w-full rounded-xl px-3.5 py-2.5 text-[13.5px] font-mono"
              />
            </Field>

            <Field label="Model" hint="模型 ID">
              <input
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                placeholder="deepseek-chat"
                spellCheck={false}
                className="field-input w-full rounded-xl px-3.5 py-2.5 text-[13.5px] font-mono"
              />
            </Field>

            <Field
              className="col-span-3"
              label="API Key"
              rightLabel={<span className="text-[11px] text-ink-500 font-normal">仅本地保存</span>}
            >
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={draft.apiKey}
                  onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="field-input w-full rounded-xl px-3.5 py-2.5 text-[13.5px] font-mono pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] text-ink-500 hover:text-ink-900 hover:bg-paper-200 transition-colors flex items-center gap-1"
                >
                  {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
            </Field>

            <Field
              className="col-span-3"
              label="Temperature"
              rightLabel={
                <span className="font-mono text-[13px] text-accent-600">{draft.temperature}</span>
              }
            >
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={draft.temperature}
                onChange={(e) => setDraft({ ...draft, temperature: Number(e.target.value) })}
                className="slider"
                style={{ '--val': `${tempPct}%` } as React.CSSProperties}
              />
              <div className="mt-1.5 flex justify-between text-[11px] text-ink-500">
                <span>更确定 · 0</span>
                <span>平衡</span>
                <span>更发散 · 2</span>
              </div>
            </Field>

            <Field
              className="col-span-3"
              label="Default System Prompt"
              rightLabel={
                <span className="text-[11px] text-ink-500 font-normal">每个会话可单独覆盖</span>
              }
            >
              <textarea
                rows={3}
                value={draft.defaultSystemPrompt}
                onChange={(e) => setDraft({ ...draft, defaultSystemPrompt: e.target.value })}
                spellCheck={false}
                className="field-input w-full rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed resize-none"
              />
            </Field>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-rose-100 bg-rose-100/40 px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 grid place-items-center flex-none text-rose-500">
              <Trash2 size={15} strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-rose-500">清空所有对话</div>
              <div className="text-[11.5px] text-ink-500 mt-0.5">
                不可恢复。所有本地会话与消息会被删除。
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('确定要清空所有对话吗？此操作不可恢复。')) {
                  clearAll();
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-[12.5px] font-medium text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
            >
              清空
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 bg-paper-100/60 border-t border-paper-300/50 flex items-center justify-between">
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-ink-500 hover:text-ink-900 inline-flex items-center gap-1"
          >
            <HelpCircle size={12} />
            如何获取 API Key？
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-ink-700 hover:bg-paper-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                settings.update({
                  baseURL: draft.baseURL.trim(),
                  apiKey: draft.apiKey.trim(),
                  model: draft.model.trim(),
                  temperature: draft.temperature,
                  defaultSystemPrompt: draft.defaultSystemPrompt,
                });
                onClose();
              }}
              className="px-4 py-2 text-[13px] font-medium text-white bg-ink-900 hover:bg-ink-700 rounded-lg transition-colors shadow-soft"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  rightLabel?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, hint, rightLabel, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-ink-700 mb-1.5">
        <span className="flex items-center justify-between">
          <span>{label}</span>
          {rightLabel}
        </span>
      </label>
      {children}
      {hint && <div className="mt-1.5 text-[11.5px] text-ink-500">{hint}</div>}
    </div>
  );
}
