import { useLocation, useNavigate } from "react-router-dom";
import { User, HardDrive, BellRing, LogOut, Settings, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserProfile } from "@/pages/SignupPage";
import { getStoredAvatar, getAvatarIcon } from "@/utils/avatar";
import { Button } from "@/components/ui/button";
import { ProgramIcon } from "@/components/ProgramIcon";
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
  const storedAvatar = getStoredAvatar();
  const AvatarIcon = getAvatarIcon(storedAvatar.icon || 'User');

  const [showDevDialog, setShowDevDialog] = useState(false);
  const [selectedLocked, setSelectedLocked] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
              <h1 className="text-2xl font-bold text-foreground">Home</h1>
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
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1">
                  <Avatar className="h-9 w-9 border-2 border-primary/20" style={{ backgroundColor: storedAvatar.color }}>
                    {storedAvatar.type === 'image' ? (
                      <AvatarImage src={storedAvatar.src || undefined} alt={userName} />
                    ) : (
                      <AvatarFallback className="text-primary-foreground text-xs font-bold">
                        <AvatarIcon className="h-5 w-5" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground">{userName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span>{userName}</span>
                  {userProfile?.healthFacility && (
                    <span className="text-xs text-muted-foreground">{userProfile.healthFacility}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {settingsItems.map((item) => (
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
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 px-4 py-3 space-y-2">
            {Object.entries(programMap).map(([key, item]) => {
              const isCurrentProgram = key === currentProgram;
              return (
                <button
                  key={key}
                  onClick={() => {
                    handleProgramClick(key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    isCurrentProgram
                      ? `${item.bgClass} text-white`
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <ProgramIcon program={key} className="h-7 w-7" />
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Under Development Dialog */}
      <Dialog open={showDevDialog} onOpenChange={setShowDevDialog}>
        <DialogContent className="sm:max-w-md border-0 bg-white shadow-lg">
          <div className="flex flex-col items-center justify-center text-center py-8 px-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12 }}
              className="h-20 w-20 rounded-2xl bg-yellow-100 flex items-center justify-center mb-6"
            >
              <Construction className="h-10 w-10 text-yellow-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Development</h2>
            <p className="text-base text-gray-700 mb-8">
              <span className="font-semibold">{selectedLocked}</span> module is currently under development and will be available in a future update. Stay tuned!
            </p>
            <button
              onClick={() => setShowDevDialog(false)}
              className="px-8 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

