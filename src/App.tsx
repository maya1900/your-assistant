import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { ChatView } from '@/components/Chat/ChatView';
import { SettingsDialog } from '@/components/Settings/SettingsDialog';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const MD_BREAKPOINT = 768;

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
      if (mod && e.key === 'k') {
        e.preventDefault();
        createConversation();
        setMobileSidebarOpen(false);
        return;
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
        setMobileSidebarOpen(false);
        return;
      }
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createConversation, mobileSidebarOpen]);

  // 窗口跨过 md 阈值时强制收起抽屉，避免布局错乱
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= MD_BREAKPOINT) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <div className="sunrise-wash" />
      <div className="grain-overlay" />
      <div className="relative z-10 flex h-dvh w-screen overflow-hidden">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          onOpenSettings={() => {
            setSettingsOpen(true);
            setMobileSidebarOpen(false);
          }}
        />
        <ChatView
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
