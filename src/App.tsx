import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { ChatView } from '@/components/Chat/ChatView';
import { SettingsDialog } from '@/components/Settings/SettingsDialog';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const createConversation = useChatStore((s) => s.createConversation);
  const isConfigured = useSettingsStore((s) => s.isConfigured());

  // First-run: if no settings yet, open settings dialog automatically
  useEffect(() => {
    if (!isConfigured) setSettingsOpen(true);
  }, [isConfigured]);

  // Global keyboard: ⌘K / Ctrl+K → new conversation, ⌘, / Ctrl+, → settings
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'k') {
        e.preventDefault();
        createConversation();
      } else if (e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createConversation]);

  return (
    <>
      <div className="sunrise-wash" />
      <div className="grain-overlay" />
      <div className="relative z-10 flex h-screen w-screen overflow-hidden">
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
        <ChatView onOpenSettings={() => setSettingsOpen(true)} />
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
