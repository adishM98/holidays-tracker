import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ApplyLeave from "@/pages/ApplyLeave";
import LeaveHistory from "@/pages/LeaveHistory";
import PendingApprovals from "@/pages/PendingApprovals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
