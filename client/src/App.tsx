import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import PublicProfile from "@/pages/profile";
import PublicMenu from "@/pages/public-menu";
import InviteAccept from "@/pages/invite";
import ForceChangePassword from "@/pages/change-password";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import PricingPage from "@/pages/pricing";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import DocsPage from "@/pages/docs";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import SupportPage from "@/pages/support";
import GdprPage from "@/pages/gdpr";
import RefundPolicyPage from "@/pages/refund-policy";
import AffiliateDashboard from "@/pages/affiliate-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/gdpr" component={GdprPage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route path="/affiliate" component={AffiliateDashboard} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/change-password" component={ForceChangePassword} />
      <Route path="/invite/:token" component={InviteAccept} />
      <Route path="/:username/menu" component={PublicMenu} />
      <Route path="/:username" component={PublicProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
