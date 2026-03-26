import { useState } from "react";
import { Mail, MessageCircle, Phone, User, Send, Loader2 } from "lucide-react";
import LegalLayout from "@/components/legal-layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in name, email, and message", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    setSending(true);
    try {

      const res = await fetch("/api/website-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Message sent! ✉️", description: "We'll get back to you soon." });
      setName("");
      setEmail("");
      setMobile("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <LegalLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          Have a question, feedback, or need help? We'd love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
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

        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Send us a message</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contact-name"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={255}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-mobile">Mobile Number (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contact-mobile"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="pl-10"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message <span className="text-destructive">*</span></Label>
              <Textarea
                id="contact-message"
                placeholder="How can we help you?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
            </div>

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </div>
    </LegalLayout>
  );
}
