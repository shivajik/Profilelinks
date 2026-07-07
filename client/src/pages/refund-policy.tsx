import LegalLayout from "@/components/legal-layout";
import SEO from "@/components/seo";

export default function RefundPolicyPage() {
  return (
    <LegalLayout>
      <SEO
        title="Refund Policy — VisiCardly"
        description="All VisiCardly purchases are final and non-refundable. Read our refund policy, cancellation rules and exceptions for duplicate charges."
        path="/refund-policy"
      />
      <div className="max-w-3xl mx-auto px-6 py-16 prose prose-sm dark:prose-invert">
        <div className="aurora-chip mb-6 not-prose">— Billing</div>
        <h1 className="aurora-display text-5xl md:text-6xl mb-3 not-prose">Refund <em>Policy</em></h1>
        <p className="text-muted-foreground landing-mono text-xs uppercase not-prose mb-8">Last updated · February 2026</p>

        <h2>No Refund Policy</h2>
        <p>
          All purchases made on VisiCardly are <strong>final and non-refundable</strong>. Once a subscription or plan has been purchased, we do not offer refunds under any circumstances.
        </p>

        <h2>What This Means</h2>
        <ul>
          <li>Monthly and yearly subscription payments are non-refundable once processed.</li>
          <li>Upgrading or downgrading your plan does not entitle you to a refund for the previous plan period.</li>
          <li>If you cancel your subscription, you will continue to have access to your plan features until the end of your current billing period. No prorated refunds will be issued.</li>
        </ul>

        <h2>Before You Purchase</h2>
        <p>
          We encourage you to explore our free plan and trial features before committing to a paid subscription. This allows you to evaluate whether VisiCardly meets your needs.
        </p>

        <h2>Exceptions</h2>
        <p>
          In rare cases of technical errors resulting in duplicate charges, please contact our support team at{" "}
          <a href="mailto:support@visicardly.com" className="text-primary">support@visicardly.com</a>{" "}
          and we will investigate and resolve the issue.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about this policy, please reach out to{" "}
          <a href="mailto:support@visicardly.com" className="text-primary">support@visicardly.com</a>.
        </p>
      </div>
    </LegalLayout>
  );
}
