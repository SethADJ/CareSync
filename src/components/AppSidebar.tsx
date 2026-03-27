import { useState } from "react";
import { User, HardDrive, ArrowLeftRight, ClipboardList, BarChart3, BellRing, Construction, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserProfile } from "@/pages/SignupPage";
import { getStoredAvatar, getAvatarIcon } from "@/utils/avatar";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ProgramIcon } from "@/components/ProgramIcon";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const programMap: Record<string, { title: string; url: string; colorClass: string; bgClass: string; locked: boolean }> = {
  tbcare: { title: "TBCare", url: "/tbcare", colorClass: "text-primary", bgClass: "bg-primary", locked: false },
  hivcare: { title: "HIVCare", url: "/hivcare", colorClass: "text-destructive", bgClass: "bg-destructive", locked: false },
  epi: { title: "EPI", url: "/epi", colorClass: "text-blue-600", bgClass: "bg-blue-600", locked: true },
  anc: { title: "ANC", url: "/anc", colorClass: "text-green-600", bgClass: "bg-green-600", locked: true },
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

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  const currentProgram = getCurrentProgram(location.pathname);
  const activeProgramItem = currentProgram ? programMap[currentProgram] : null;

  const userProfile = getUserProfile();
  const userName = userProfile?.firstName || 'User';

  const storedAvatar = getStoredAvatar();
  const AvatarIcon = getAvatarIcon(storedAvatar.icon || 'User');

  const [showDevDialog, setShowDevDialog] = useState(false);
  const [selectedLocked, setSelectedLocked] = useState('');

  const handleProgramClick = (key: string) => {
    const prog = programMap[key];
    if (prog.locked) {
      setSelectedLocked(prog.title);
      setShowDevDialog(true);
    } else {
      navigate(`/${key}/dashboard`);
      if (isMobile) setOpenMobile(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" className="bg-gradient-to-b from-sidebar/50 to-sidebar [background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 11px)]">
        <SidebarHeader className="p-4">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity w-full"
          >
            <Avatar className={`${collapsed ? 'h-12 w-12 mx-auto' : 'h-16 w-16'} shrink-0 border-3 border-sidebar-foreground/30 ring-3 ring-sidebar-foreground/10`} style={{ backgroundColor: storedAvatar.color }}>
              {storedAvatar.type === 'image' ? (
                <AvatarImage src={storedAvatar.src || undefined} alt={userName} />
              ) : (
                <AvatarFallback className="text-sidebar-primary-foreground text-xs font-bold">
                  <AvatarIcon className="h-6 w-6" />
                </AvatarFallback>
              )}
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-bold text-sidebar-foreground truncate">{userName}</span>
                {userProfile?.healthFacility && (
                  <span className="text-xs text-sidebar-foreground/70 truncate">{userProfile.healthFacility}</span>
                )}
              </div>
            )}
          </button>
        </SidebarHeader>
        <SidebarContent>
          {/* Current Program Section */}
          {activeProgramItem && !activeProgramItem.locked && currentProgram && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 flex items-center gap-2">
                <ProgramIcon program={currentProgram} className="h-4 w-4" />
                {!collapsed && activeProgramItem.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        const prog = getCurrentProgram(location.pathname) || 'tbcare';
                        navigate(`${programMap[prog].url}/dashboard`);
                      }}
                      isActive={isActive(currentProgram ? `${programMap[currentProgram].url}/dashboard` : '/tbcare/dashboard')}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        const prog = getCurrentProgram(location.pathname) || 'tbcare';
                        navigate(programMap[prog].url);                          if (isMobile) setOpenMobile(false);                      }}
                      isActive={isActive(currentProgram ? programMap[currentProgram].url : '/tbcare')}
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>Patients</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        const prog = getCurrentProgram(location.pathname) || 'tbcare';
                        navigate(`${programMap[prog].url}/reports`);                          if (isMobile) setOpenMobile(false);                      }}
                      isActive={isActive(currentProgram ? `${programMap[currentProgram].url}/reports` : '/tbcare/reports')}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Reports</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        const prog = getCurrentProgram(location.pathname) || 'tbcare';
                        navigate(`${programMap[prog].url}/log`);                          if (isMobile) setOpenMobile(false);                      }}
                      isActive={isActive(currentProgram ? `${programMap[currentProgram].url}/log` : '/tbcare/log')}
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>Defaulter Tracing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Program Switcher */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {activeProgramItem ? (
                <span className="flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" /> Switch Program
                </span>
              ) : (
                "Programs"
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Object.entries(programMap)
                  .filter(([key]) => key !== currentProgram)
                  .map(([key, item]) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        isActive={false}
                        onClick={() => handleProgramClick(key)}
                        className="cursor-pointer"
                      >
                        <ProgramIcon program={key} className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Settings */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => {
                        navigate(item.url);
                        if (isMobile) setOpenMobile(false);
                      }}
                      isActive={isActive(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              {!collapsed && (
                <div className="pt-3 px-4 text-xs text-sidebar-foreground/50 space-y-2">
                  <div>CareSync v1.0.26</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      localStorage.removeItem('caresync_logged_in');
                      navigate('/login');
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Under Development Dialog */}
      <Dialog open={showDevDialog} onOpenChange={setShowDevDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12 }}
              className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-2"
            >
              <Construction className="h-8 w-8 text-warning" />
            </motion.div>
            <DialogTitle className="text-xl">Under Development</DialogTitle>
            <DialogDescription className="text-center">
              <span className="font-semibold text-foreground">{selectedLocked}</span> module is currently under development and will be available in a future update. Stay tuned!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-2">
            <Button onClick={() => setShowDevDialog(false)} variant="outline">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
