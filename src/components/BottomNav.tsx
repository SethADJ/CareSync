import { useLocation, useNavigate } from "react-router-dom";
import { Users, ClipboardList, BarChart3, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

function getCurrentProgram(pathname: string): string | null {
  const match = pathname.match(/^\/(tbcare|hivcare|epi|anc)/);
  return match ? match[1] : null;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentProgram = getCurrentProgram(location.pathname);

  // Don't show bottom nav on non-program pages
  if (!currentProgram) {
    return null;
  }

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: `/${currentProgram}/dashboard`,
      activePattern: `^/${currentProgram}/dashboard$`,
    },
    {
      label: "Patients",
      icon: Users,
      path: `/${currentProgram}`,
      activePattern: `^/${currentProgram}$`,
    },
    {
      label: "Defaulter Tracking",
      icon: ClipboardList,
      path: `/${currentProgram}/log`,
      activePattern: `^/${currentProgram}/log$`,
    },
    {
      label: "Report",
      icon: BarChart3,
      path: `/${currentProgram}/reports`,
      activePattern: `^/${currentProgram}/reports$`,
    },
  ];

  const isActive = (pattern: string) => {
    const regex = new RegExp(pattern);
    return regex.test(location.pathname);
  };

  return (
    <nav className="sticky bottom-0 z-40 w-full border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 h-20 flex items-center justify-around gap-2 md:gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.activePattern);

          return (
            <Button
              key={item.label}
              onClick={() => navigate(item.path)}
              variant={active ? "default" : "outline"}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-auto py-3 rounded-lg transition-all whitespace-normal ${
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-xs md:text-sm font-medium text-center">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
