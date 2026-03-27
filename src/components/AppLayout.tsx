import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSwipe } from "@/hooks/useSwipe";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useBackupReminder } from "@/hooks/useBackupReminder";

function getSidebarClass(pathname: string): string {
  if (pathname.startsWith('/hivcare')) return 'sidebar-hivcare';
  return '';
}

// Program tab routes for swipe navigation within a program
const programTabs = ['dashboard', '', 'reports', 'log'];
function getProgramTabInfo(pathname: string): { program: string; tabIndex: number } | null {
  const match = pathname.match(/^\/(tbcare|hivcare)(\/(.*))?$/);
  if (!match) return null;
  const program = match[1];
  const sub = match[3] || '';
  let tabIndex = programTabs.indexOf(sub);
  if (tabIndex === -1) tabIndex = 1;
  return { program, tabIndex };
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarClass = getSidebarClass(location.pathname);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  useBackupReminder();

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (direction !== 'left' && direction !== 'right') return;

    const tabInfo = getProgramTabInfo(location.pathname);
    if (tabInfo) {
      const nextIndex = direction === 'left' ? tabInfo.tabIndex + 1 : tabInfo.tabIndex - 1;
      if (nextIndex >= 0 && nextIndex < programTabs.length) {
        const tab = programTabs[nextIndex];
        const newPath = tab ? `/${tabInfo.program}/${tab}` : `/${tabInfo.program}`;
        setSwipeDir(direction);
        setTimeout(() => {
          navigate(newPath);
          setSwipeDir(null);
        }, 100);
        return;
      }
    }

    setSwipeDir(direction);
    setTimeout(() => {
      if (direction === 'right') {
        window.history.back();
      } else {
        window.history.forward();
      }
      setSwipeDir(null);
    }, 100);
  }, [navigate, location.pathname]);

  const swipeHandlers = useSwipe({ onSwipe: handleSwipe, threshold: 60 });

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${sidebarClass}`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-20 flex items-center border-b border-border/60 bg-card/95 backdrop-blur-md px-4 md:px-6 shrink-0 sticky top-0 z-30">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              aria-label="Go to home"
            >
              <Logo className="h-24 w-24 md:h-28 md:w-28 drop-shadow-md" />
            </button>
            <div className="flex-1" />

          </header>
          <main
            className="flex-1 overflow-auto p-3 md:p-6 bg-texture bg-grain relative min-w-0 overflow-x-hidden"
            {...swipeHandlers}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, x: swipeDir === 'left' ? 40 : swipeDir === 'right' ? -40 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: swipeDir === 'left' ? -40 : swipeDir === 'right' ? 40 : 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
