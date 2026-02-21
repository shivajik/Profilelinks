import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Target, Heart } from "lucide-react";

export default function AboutPage() {
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
        <h1 className="text-4xl font-extrabold text-foreground mb-6">About Linkfolio</h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          Linkfolio is your all-in-one link-in-bio platform designed for creators, businesses, and teams who want a beautiful, customizable page to share their online presence.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {[
            { icon: Target, title: "Our Mission", desc: "To give every creator and business a stunning, professional page to share their world — without needing any technical skills." },
            { icon: Users, title: "Built for Everyone", desc: "From solo creators to enterprise teams, Linkfolio scales with your needs. Individual profiles, team branding, digital menus — all in one platform." },
            { icon: Heart, title: "Made with Care", desc: "Every feature is designed with simplicity and elegance in mind. We obsess over the details so you can focus on what matters." },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of creators using Linkfolio today.</p>
          <WouterLink href="/auth?tab=register">
            <Button size="lg">Create your page</Button>
          </WouterLink>
        </div>
      </main>
    </div>
  );
}
