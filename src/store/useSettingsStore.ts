import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '@/types';

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  isConfigured: () => boolean;
}

const DEFAULTS: Settings = {
  baseURL: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  defaultSystemPrompt:
    '你是一个克制、诚实、有审美的助手。回答要简洁，用 Markdown 组织结构，代码示例必给可运行版本。',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      update: (patch) => set(patch),
      isConfigured: () => {
        const s = get();
        return Boolean(s.baseURL && s.apiKey && s.model);
      },
    }),
    { name: 'hearth.settings.v1' }
  )
);
