import { useState, useEffect } from "react";
import { useLocation, Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, Copy, Loader2, TrendingUp, Users, IndianRupee,
  Clock, CheckCircle, ExternalLink,
} from "lucide-react";

interface AffiliateData {
  id: string;
  referralCode: string;
  commissionRate: number;
  isActive: boolean;
  totalEarnings: number;
}

interface Referral {
  id: string;
  referredUserId: string;
  commissionAmount: string;
  status: string;
  createdAt: string;
  username?: string;
  email?: string;
}

interface DashboardData {
  affiliate: AffiliateData;
  referrals: Referral[];
  stats: {
    totalReferrals: number;
    pendingReferrals: number;
    convertedReferrals: number;
    totalEarnings: number;
  };
}

export default function AffiliateDashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAffiliate, setNotAffiliate] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    fetch("/api/affiliate/dashboard")
      .then(r => {
        if (r.status === 404) { setNotAffiliate(true); setLoading(false); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setNotAffiliate(true))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const referralLink = data
    ? `${window.location.origin}/auth?ref=${data.affiliate.referralCode}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notAffiliate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <Users className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Not an Affiliate</h2>
            <p className="text-muted-foreground text-sm">
              You are not registered as an affiliate. Please contact the admin to join the affiliate programme.
            </p>
            <WouterLink href="/dashboard">
              <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button>
            </WouterLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { affiliate, referrals, stats } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <WouterLink href="/dashboard">
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </a>
          </WouterLink>
          <Badge variant={affiliate.isActive ? "default" : "secondary"}>
            {affiliate.isActive ? "Active Affiliate" : "Inactive"}
          </Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Affiliate Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your referrals and earnings. Commission rate: <span className="font-semibold text-primary">{affiliate.commissionRate}%</span>
          </p>
        </div>

        {/* Referral Link */}
        <Card>
          <CardHeader><CardTitle className="text-base">Your Referral Link</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="font-mono text-xs" />
              <Button onClick={copyLink} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this link. When someone registers and purchases a plan through it, you earn {affiliate.commissionRate}% commission.
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Referrals", value: stats.totalReferrals, icon: Users, color: "text-blue-500" },
            { label: "Pending", value: stats.pendingReferrals, icon: Clock, color: "text-yellow-500" },
            { label: "Converted", value: stats.convertedReferrals, icon: CheckCircle, color: "text-green-500" },
            { label: "Total Earnings", value: `₹${stats.totalEarnings.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Referrals</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Commission</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No referrals yet. Share your link to start earning!
                      </td>
                    </tr>
                  ) : referrals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{r.username ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{r.email ?? ""}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={r.status === "converted" ? "default" : r.status === "paid" ? "default" : "secondary"} className="capitalize text-xs">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {parseFloat(r.commissionAmount) > 0 ? `₹${parseFloat(r.commissionAmount).toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
