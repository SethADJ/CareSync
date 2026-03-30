import { useNavigate, useLocation } from "react-router-dom";
import { useSwipe } from "@/hooks/useSwipe";
import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { useBackupReminder } from "@/hooks/useBackupReminder";
import { RefreshCw } from "lucide-react";

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
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  useBackupReminder();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Add a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload();
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    // Handle pull-to-refresh (down swipe at top of page)
    if (direction === 'down') {
      if (mainRef.current && mainRef.current.scrollTop === 0) {
        handleRefresh();
      }
      return;
    }

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
  }, [navigate, location.pathname, handleRefresh]);

  const swipeHandlers = useSwipe({ onSwipe: handleSwipe, threshold: 60 });

  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNav />
      <main
        ref={mainRef}
        className="flex-1 overflow-auto p-3 md:p-6 bg-texture bg-grain relative min-w-0 overflow-x-hidden pb-28"
        {...swipeHandlers}
      >
        {/* Pull-to-refresh indicator */}
        {isRefreshing && (
          <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center pt-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="bg-primary text-white rounded-full p-3 shadow-lg"
            >
              <RefreshCw className="h-5 w-5" />
            </motion.div>
          </div>
        )}
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
      <BottomNav />
    </div>
  );
}
