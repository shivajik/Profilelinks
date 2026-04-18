import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { useIsNativeApp } from "@/hooks/use-native-app";

// Eagerly loaded (critical path)
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";

// Lazy loaded (non-critical)
const RestaurantLanding = lazy(() => import("@/pages/restaurant"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const PublicProfile = lazy(() => import("@/pages/profile"));
const PublicMenu = lazy(() => import("@/pages/public-menu"));
const PublicServicesProducts = lazy(() => import("@/pages/public-services-products"));
const TeamMemberProfile = lazy(() => import("@/pages/team-member-profile"));
const InviteAccept = lazy(() => import("@/pages/invite"));
const ForceChangePassword = lazy(() => import("@/pages/change-password"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const TermsPage = lazy(() => import("@/pages/terms"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const DocsPage = lazy(() => import("@/pages/docs"));
const AboutPage = lazy(() => import("@/pages/about"));
const ContactPage = lazy(() => import("@/pages/contact"));
const SupportPage = lazy(() => import("@/pages/support"));
const GdprPage = lazy(() => import("@/pages/gdpr"));
const RefundPolicyPage = lazy(() => import("@/pages/refund-policy"));
const AffiliateDashboard = lazy(() => import("@/pages/affiliate-dashboard"));
const LtdRegisterPage = lazy(() => import("@/pages/ltd-register"));
const LtdPurchasePage = lazy(() => import("@/pages/ltd-purchase"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

/**
 * Root entry: in the native mobile app, skip the marketing landing page.
 * - Logged in → /dashboard
 * - Not logged in → /auth
 * On the web, show the regular landing page.
 */
function RootEntry() {
  const isNative = useIsNativeApp();
  const { user, isLoading } = useAuth();

  if (!isNative) return <Landing />;
  if (isLoading) return <PageLoader />;
  if (user) {
    if ((user as any).mustChangePassword) return <Redirect to="/change-password" />;
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }
  return <Redirect to="/auth" />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={RootEntry} />
        <Route path="/restaurant" component={RestaurantLanding} />
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
        <Route path="/ltd-register" component={LtdRegisterPage} />
        <Route path="/ltd-purchase" component={LtdPurchasePage} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/change-password" component={ForceChangePassword} />
        <Route path="/invite/:token" component={InviteAccept} />
        <Route path="/:username/menu" component={PublicMenu} />
        <Route path="/:slug/service">{() => <PublicServicesProducts type="services" />}</Route>
        <Route path="/:slug/product">{() => <PublicServicesProducts type="products" />}</Route>
        <Route path="/:companySlug/:username" component={TeamMemberProfile} />
        <Route path="/:username" component={PublicProfile} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
