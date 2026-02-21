import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-4 px-6 py-3">
          <WouterLink href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </WouterLink>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">link</span>folio
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-sm dark:prose-invert">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Refund Policy</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <h2>No Refund Policy</h2>
        <p>
          All purchases made on Linkfolio are <strong>final and non-refundable</strong>. Once a subscription or plan has been purchased, we do not offer refunds under any circumstances.
        </p>

        <h2>What This Means</h2>
        <ul>
          <li>Monthly and yearly subscription payments are non-refundable once processed.</li>
          <li>Upgrading or downgrading your plan does not entitle you to a refund for the previous plan period.</li>
          <li>If you cancel your subscription, you will continue to have access to your plan features until the end of your current billing period. No prorated refunds will be issued.</li>
        </ul>

        <h2>Before You Purchase</h2>
        <p>
          We encourage you to explore our free plan and trial features before committing to a paid subscription. This allows you to evaluate whether Linkfolio meets your needs.
        </p>

        <h2>Exceptions</h2>
        <p>
          In rare cases of technical errors resulting in duplicate charges, please contact our support team at{" "}
          <a href="mailto:support@linkfolio.com" className="text-primary">support@linkfolio.com</a>{" "}
          and we will investigate and resolve the issue.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about this policy, please reach out to{" "}
          <a href="mailto:support@linkfolio.com" className="text-primary">support@linkfolio.com</a>.
        </p>
      </main>
    </div>
  );
}
