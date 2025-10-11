import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout/Layout";
import { useFavicon } from "@/hooks/use-favicon";
import { lazy, Suspense } from "react";

// Lazy load route components for better code splitting
const Login = lazy(() => import("@/pages/Login"));
const Invite = lazy(() => import("@/pages/Invite"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ApplyLeave = lazy(() => import("@/pages/ApplyLeave"));
const LeaveHistory = lazy(() => import("@/pages/LeaveHistory"));
const PendingApprovals = lazy(() => import("@/pages/PendingApprovals"));
const Profile = lazy(() => import("@/pages/Profile"));
const EmployeesDebug = lazy(() => import("@/pages/admin/EmployeesDebug"));
const LeaveCalendar = lazy(() => import("@/pages/admin/LeaveCalendar"));
const Reports = lazy(() => import("@/pages/admin/Reports"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppContent = () => {
  useFavicon();
  return null;
};

// Loading fallback component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <AuthProvider>
        <AppContent />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/apply-leave" element={
              <ProtectedRoute>
                <Layout>
                  <ApplyLeave />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/leave-history" element={
              <ProtectedRoute>
                <Layout>
                  <LeaveHistory />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/pending-approvals" element={
              <ProtectedRoute>
                <Layout>
                  <PendingApprovals />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/team-requests" element={
              <ProtectedRoute>
                <Layout>
                  <LeaveHistory />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/employees" element={
              <ProtectedRoute>
                <Layout>
                  <EmployeesDebug />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/calendar" element={
              <ProtectedRoute>
                <Layout>
                  <LeaveCalendar />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
