import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";

export default function ContactPage() {
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
      <main className="max-w-3xl mx-auto px-6 py-16">
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
            <a href="mailto:support@linkfolio.com" className="text-sm text-primary hover:underline">
              support@linkfolio.com
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
      </main>
    </div>
  );
}
