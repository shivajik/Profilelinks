import { Mail, MessageCircle } from "lucide-react";
import LegalLayout from "@/components/legal-layout";

export default function ContactPage() {
  return (
    <LegalLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          Have a question, feedback, or need help? We'd love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Email Us</h3>
            <p className="text-sm text-muted-foreground mb-3">For general inquiries and support</p>
            <a href="mailto:support@visicardly.com" className="text-sm text-primary hover:underline">
              support@visicardly.com
            </a>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-3">Get instant help during business hours</p>
            <span className="text-sm text-muted-foreground">Available Mon-Fri, 9am-6pm IST</span>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
