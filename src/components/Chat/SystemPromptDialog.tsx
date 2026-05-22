import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SystemPromptDialog({ open, onClose }: Props) {
  const conv = useChatStore((s) => s.getActive());
  const setSystemPrompt = useChatStore((s) => s.setSystemPrompt);
  const defaultPrompt = useSettingsStore((s) => s.defaultSystemPrompt);

  const [draft, setDraft] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (!conv) return;
    if (conv.systemPrompt !== undefined) {
      setUseCustom(true);
      setDraft(conv.systemPrompt);
    } else {
      setUseCustom(false);
      setDraft('');
    }
  }, [conv, open]);

  if (!open || !conv) return null;

  return (
    <div className="fixed inset-0 z-40 dialog-backdrop sm:grid sm:place-items-center sm:px-6" onClick={onClose}>
      <div
        className="dialog-card w-full sm:max-w-[560px] h-dvh sm:h-auto rounded-none sm:rounded-3xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-3 flex items-start gap-4 flex-none">
          <div className="brand-mark mt-1" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[20px] sm:text-[22px] leading-tight tracking-tight-display">
              会话级 System Prompt
            </h2>
            <p className="text-[12.5px] text-ink-500 mt-1">
              只影响当前对话。不设置时使用全局默认值。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-paper-200/60 grid place-items-center text-ink-500 hover:text-ink-900 transition-colors flex-none"
          >
            <X size={16} />
          </button>
        </div>

        <div className="hairline mx-5 sm:mx-7" />

        <div className="px-5 sm:px-7 py-5 space-y-4 flex-1 min-h-0 overflow-y-auto nice-scroll">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="accent-accent-500"
            />
            <span>为当前对话自定义 System Prompt</span>
          </label>

          {useCustom ? (
            <textarea
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="例如：你是一个资深的前端架构师，回答要尖锐、不绕弯。"
              className="field-input w-full rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed resize-none"
            />
          ) : (
            <div className="text-[12.5px] text-ink-500 leading-relaxed bg-paper-50 border border-paper-300/60 rounded-xl px-3.5 py-2.5">
              <div className="text-[11px] uppercase tracking-wider-meta text-ink-500 mb-1">
                当前生效（全局默认）
              </div>
              {defaultPrompt || '（无）'}
            </div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 bg-paper-100/60 border-t border-paper-300/50 flex items-center justify-end gap-2 flex-none">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-ink-700 hover:bg-paper-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              setSystemPrompt(conv.id, useCustom ? draft : undefined);
              onClose();
            }}
            className="px-4 py-2 text-[13px] font-medium text-white bg-ink-900 hover:bg-ink-700 rounded-lg transition-colors shadow-soft"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
