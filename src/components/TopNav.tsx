import { useLocation, useNavigate } from "react-router-dom";
import { User, HardDrive, BellRing, LogOut, Settings, Menu, X } from "lucide-react";
import { getUserProfile } from "@/pages/SignupPage";
import { getAvatarById } from "@/utils/avatars";
import { Button } from "@/components/ui/button";
import { ProgramIcon } from "@/components/ProgramIcon";
import { Logo } from "@/components/Logo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const programMap: Record<string, { title: string; url: string; colorClass: string; bgClass: string; locked: boolean }> = {
  tbcare: { title: "TBCare", url: "/tbcare", colorClass: "text-primary", bgClass: "bg-primary", locked: false },
  hivcare: { title: "HIVCare", url: "/hivcare", colorClass: "text-red-600", bgClass: "bg-red-600", locked: true },
  epi: { title: "EPI", url: "/epi", colorClass: "text-green-600", bgClass: "bg-green-600", locked: true },
  anc: { title: "ANC", url: "/anc", colorClass: "text-orange-600", bgClass: "bg-orange-600", locked: true },
};

const settingsItems = [
  { title: "My Profile", url: "/profile", icon: User },
  { title: "Reminders", url: "/reminders", icon: BellRing },
  { title: "Backup & Sync", url: "/backup", icon: HardDrive },
];

function getCurrentProgram(pathname: string): string | null {
  const match = pathname.match(/^\/(tbcare|hivcare|epi|anc)/);
  return match ? match[1] : null;
}

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentProgram = getCurrentProgram(location.pathname);
  const activeProgramItem = currentProgram ? programMap[currentProgram] : null;
  
  const userProfile = getUserProfile();
  const userName = userProfile?.firstName || 'User';

  const [showDevDialog, setShowDevDialog] = useState(false);
  const [selectedLocked, setSelectedLocked] = useState('');

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const handleProgramClick = (key: string) => {
    const prog = programMap[key];
    if (prog.locked) {
      setSelectedLocked(prog.title);
      setShowDevDialog(true);
    } else {
      navigate(`/${key}/dashboard`);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 h-16 flex items-center justify-between">
          {/* Left: Logo/Home */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/welcome')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Logo className="h-20 w-20" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">
                {activeProgramItem?.title || 'CareSync'}
              </span>
            </button>
          </div>

          {/* Center: Program Switcher (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {Object.entries(programMap).map(([key, item]) => {
              const isCurrentProgram = key === currentProgram;
              return (
                <button
                  key={key}
                  onClick={() => handleProgramClick(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer font-medium text-sm border ${
                    isCurrentProgram
                      ? `${item.bgClass} text-white border-transparent shadow-md hover:shadow-lg scale-105`
                      : `text-muted-foreground bg-muted/30 border-border hover:${item.bgClass} hover:text-white hover:border-transparent hover:shadow-md`
                  }`}
                >
                  <ProgramIcon program={key} className="h-6 w-6" />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Settings & User Menu */}
          <div className="flex items-center gap-2">
            {/* Programs Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity p-2 text-sm font-medium text-foreground">
                  Programs
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {Object.entries(programMap).map(([key, item]) => {
                  const isCurrentProgram = key === currentProgram;
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleProgramClick(key)}
                      className={`cursor-pointer transition-colors ${isCurrentProgram ? item.bgClass + ' text-white' : ''}`}
                      onMouseEnter={(e) => {
                        if (!isCurrentProgram) {
                          e.currentTarget.classList.add(item.bgClass, 'text-white');
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentProgram) {
                          e.currentTarget.classList.remove(item.bgClass, 'text-white');
                        }
                      }}
                    >
                      <ProgramIcon program={key} className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Icon */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {settingsItems.filter(item => item.title !== "My Profile").map((item) => (
                  <DropdownMenuItem
                    key={item.title}
                    onClick={() => navigate(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem('caresync_logged_in');
                    navigate('/login');
                  }}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Username Button - Navigate to Profile */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 text-sm font-medium text-foreground"
            >
              {userName}
            </button>
          </div>
        </div>


      </nav>

      {/* Under Development Dialog */}
      <Dialog open={showDevDialog} onOpenChange={setShowDevDialog}>
        <DialogContent className="w-[90vw] max-w-xs sm:max-w-sm border-0 bg-white shadow-lg rounded-3xl">
          <div className="flex flex-col items-center justify-center text-center py-6 px-5">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12 }}
              className="h-16 w-16 rounded-2xl bg-yellow-100 flex items-center justify-center mb-4"
            >
              <Construction className="h-8 w-8 text-yellow-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Development</h2>
            <p className="text-sm text-gray-700 mb-6 leading-relaxed">
              <span className="font-semibold">{selectedLocked}</span> is coming soon!
            </p>
            <button
              onClick={() => setShowDevDialog(false)}
              className="px-6 py-2 bg-yellow-200 text-gray-800 font-medium rounded-full hover:bg-yellow-300 transition-colors text-sm"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

