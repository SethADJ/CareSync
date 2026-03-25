import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import WelcomePage from "@/pages/WelcomePage";
import HomePage from "@/pages/HomePage";
import SignupPage, { isUserRegistered, isLoggedIn } from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import ProgramPage from "@/pages/ProgramPage";
import ReportPage from "@/pages/ReportPage";
import TrackingLogPage from "@/pages/TrackingLogPage";
import BackupPage from "@/pages/BackupPage";
import ProfilePage from "@/pages/ProfilePage";
import ReminderPage from "@/pages/ReminderPage";
import NotFound from "./pages/NotFound";
import DashboardCardDetailPage from "@/pages/DashboardCardDetailPage";

const queryClient = new QueryClient();

function LayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isUserRegistered()) {
    return <Navigate to="/signup" replace />;
  }
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  if (isUserRegistered() && isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<RedirectIfLoggedIn><SignupPage /></RedirectIfLoggedIn>} />
          <Route path="/login" element={<RedirectIfLoggedIn><LoginPage /></RedirectIfLoggedIn>} />
          <Route path="/welcome" element={<RequireAuth><WelcomePage /></RequireAuth>} />
          <Route element={<RequireAuth><LayoutWrapper /></RequireAuth>}>
            <Route path="/tbcare" element={<ProgramPage program="tbcare" />} />
            <Route path="/tbcare/dashboard" element={<Dashboard program="tbcare" />} />
            <Route path="/hivcare/dashboard" element={<Dashboard program="hivcare" />} />
            <Route path="/:program/dashboard/:filter" element={<DashboardCardDetailPage />} />
            <Route path="/tbcare/reports" element={<ReportPage program="tbcare" />} />
            <Route path="/tbcare/log" element={<TrackingLogPage program="tbcare" />} />
            <Route path="/hivcare" element={<ProgramPage program="hivcare" />} />
            <Route path="/hivcare/reports" element={<ReportPage program="hivcare" />} />
            <Route path="/hivcare/log" element={<TrackingLogPage program="hivcare" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/reminders" element={<ReminderPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
