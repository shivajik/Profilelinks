import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PricingCard } from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, CalendarDays, CheckCircle2, FileText, Hash, Clock, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  maxLinks: number;
  maxPages: number;
  maxTeamMembers: number;
  isActive: boolean;
  isFeatured: boolean;
}

interface Subscription {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  planId: string;
  planName: string;
}

interface PaymentHistory {
  id: string;
  amount: string;
  currency: string;
  status: string;
  billingCycle?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  planName?: string;
  planDescription?: string;
}

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="razorpay"]')) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export function BillingSection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);

  // Transaction history
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; payment?: PaymentHistory }>({ open: false });

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch("/api/payments/history");
      if (r.ok) {
        const d = await r.json();
        setHistory(d.payments ?? []);
      }
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const plansFetch = fetch("/api/pricing/plans").then((r) => r.json()).catch(() => []);
    const subFetch = fetch("/api/payments/subscription").then((r) => r.json()).catch(() => null);
    Promise.all([plansFetch, subFetch]).then(([plansData, subData]) => {
      setPlans(Array.isArray(plansData) ? plansData : []);
      setSubscription(subData ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchData(); fetchHistory(); }, [fetchData, fetchHistory]);


  const handleSelectPlan = useCallback(async (plan: PricingPlan) => {
    if (!user) return;
    if (subscription?.planId === plan.id && subscription?.status === "active") return;

    setPayingPlanId(plan.id);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.free) {
        toast({ title: "Subscribed!", description: `You're now on the ${plan.name} plan.` });
        fetchData();
        setPayingPlanId(null);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay failed to load. Please refresh and try again.");

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Linkfolio",
        description: `${plan.name} Plan — ${billingCycle}`,
        order_id: data.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planId: plan.id,
                billingCycle,
              }),
            });
            const vData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vData.message);
            toast({ title: "Payment successful! 🎉", description: `You're now on the ${plan.name} plan.` });
            fetchData(); fetchHistory();
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message, variant: "destructive" });
          } finally {
            setPayingPlanId(null);
          }
        },
        prefill: { email: user.email },
        theme: { color: "hsl(var(--primary))" },
        modal: { ondismiss: () => setPayingPlanId(null) },
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setPayingPlanId(null);
    }
  }, [user, billingCycle, subscription, fetchData, fetchHistory, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Billing &amp; Plans
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your subscription and upgrade to unlock more features.
        </p>
      </div>

      {/* Current subscription banner */}
      {subscription && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              You're on the <span className="text-primary">{subscription.planName}</span> plan
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {subscription.billingCycle} billing &bull; Status:{" "}
              <span className={subscription.status === "active" ? "text-green-600" : "text-amber-600"}>
                {subscription.status}
              </span>
            </p>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <CalendarDays className="h-3.5 w-3.5" />
              Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-full p-1 text-sm w-fit">
        <button
          className={`px-4 py-1.5 rounded-full font-medium transition-all ${billingCycle === "monthly" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setBillingCycle("monthly")}
        >
          Monthly
        </button>
        <button
          className={`px-4 py-1.5 rounded-full font-medium transition-all ${billingCycle === "yearly" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setBillingCycle("yearly")}
        >
          Yearly
          <span className="ml-1.5 text-xs text-primary font-semibold">Save 20%</span>
        </button>
      </div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <p className="font-medium">No plans available yet.</p>
          <p className="text-sm mt-1">Contact support for enterprise pricing.</p>
        </div>
      ) : (
        <div className={`grid gap-5 ${plans.length === 1 ? "max-w-sm" : plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              isCurrentPlan={subscription?.planId === plan.id && subscription?.status === "active"}
              loading={payingPlanId === plan.id}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      )}

      {/* Transaction History */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistory} disabled={historyLoading}>
            {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 border rounded-xl text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-sm">No transactions yet</p>
            <p className="text-xs mt-1">Your payment history will appear here.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Cycle</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">{tx.planName ?? "—"}</td>
                    <td className="p-3 font-semibold text-foreground">₹{parseFloat(tx.amount).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground capitalize">{tx.billingCycle ?? "—"}</td>
                    <td className="p-3"><StatusChip status={tx.status} /></td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setInvoiceDialog({ open: true, payment: tx })}
                        className="text-primary hover:text-primary"
                      >
                        <FileText className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FAQ strip */}
      <div className="border-t pt-6 grid sm:grid-cols-2 gap-4">
        {[
          { q: "Can I upgrade or downgrade anytime?", a: "Yes — changes take effect immediately." },
          { q: "What payment methods are accepted?", a: "Cards, UPI, net banking, and wallets via Razorpay." },
          { q: "Are prices in INR?", a: "Yes, all prices are in Indian Rupees (₹)." },
          { q: "How do I cancel?", a: "Contact support and we'll process your cancellation promptly." },
        ].map((item) => (
          <div key={item.q} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-semibold text-foreground">{item.q}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.a}</p>
          </div>
        ))}
      </div>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialog.open} onOpenChange={(open) => setInvoiceDialog({ open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Invoice
            </DialogTitle>
          </DialogHeader>
          {invoiceDialog.payment && (() => {
            const tx = invoiceDialog.payment!;
            const invoiceNo = `INV-${tx.id.slice(0, 8).toUpperCase()}`;
            const date = new Date(tx.createdAt);
            return (
              <div className="space-y-5">
                {/* Invoice header */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <p className="font-bold text-lg text-foreground">Linkfolio</p>
                    <p className="text-xs text-muted-foreground">linkfolio.app</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">{date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                </div>

                {/* Billed to */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Billed To</p>
                    <p className="font-medium text-foreground">{user?.username ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">{user?.email ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                    <StatusChip status={tx.status} />
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{tx.billingCycle} billing</p>
                  </div>
                </div>

                <Separator />

                {/* Line items */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    <span>Description</span><span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium text-foreground">{tx.planName ?? "Subscription"} Plan</p>
                      <p className="text-xs text-muted-foreground capitalize">{tx.billingCycle} subscription</p>
                    </div>
                    <p className="font-semibold text-foreground">₹{parseFloat(tx.amount).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <p className="font-bold text-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">₹{parseFloat(tx.amount).toLocaleString()} {tx.currency}</p>
                  </div>
                </div>

                {/* Transaction IDs */}
                {(tx.razorpayOrderId || tx.razorpayPaymentId) && (
                  <>
                    <Separator />
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {tx.razorpayOrderId && (
                        <div className="flex gap-2 items-start">
                          <Hash className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>Order ID: <span className="font-mono break-all">{tx.razorpayOrderId}</span></span>
                        </div>
                      )}
                      {tx.razorpayPaymentId && (
                        <div className="flex gap-2 items-start">
                          <Hash className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>Payment ID: <span className="font-mono break-all">{tx.razorpayPaymentId}</span></span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInvoiceDialog({ open: false })}>Close</Button>
            <Button onClick={() => window.print()}>
              <FileText className="h-4 w-4 mr-2" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
