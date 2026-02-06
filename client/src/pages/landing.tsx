import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link2, Palette, Share2, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <WouterLink href="/">
            <span className="text-xl font-bold tracking-tight" data-testid="text-logo">
              <span className="text-primary">link</span>folio
            </span>
          </WouterLink>
          <div className="flex items-center gap-3">
            {user ? (
              <WouterLink href="/dashboard">
                <Button data-testid="button-dashboard">Dashboard</Button>
              </WouterLink>
            ) : (
              <>
                <WouterLink href="/auth">
                  <Button variant="ghost" data-testid="button-login">Log in</Button>
                </WouterLink>
                <WouterLink href="/auth?tab=register">
                  <Button data-testid="button-signup">Sign up free</Button>
                </WouterLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Zap className="w-3.5 h-3.5" />
              One link. All your content.
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Your digital identity,{" "}
              <span className="text-primary">simplified</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Create a beautiful, customizable landing page with all your important links. Share one URL everywhere and connect your audience to everything you create.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <WouterLink href="/auth?tab=register">
                <Button size="lg" className="text-base px-8" data-testid="button-get-started">
                  Get started for free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </WouterLink>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Simple tools to share your content with the world
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Link2 className="w-5 h-5" />}
                title="Unlimited Links"
                description="Add as many links as you want. Organize, reorder, and customize each one to match your brand."
              />
              <FeatureCard
                icon={<Palette className="w-5 h-5" />}
                title="Custom Profiles"
                description="Personalize your page with your name, bio, and profile picture. Make it uniquely yours."
              />
              <FeatureCard
                icon={<Share2 className="w-5 h-5" />}
                title="Share Everywhere"
                description="Get your own custom URL to share on social media, email signatures, or anywhere else."
              />
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Create your personalized link page in minutes.
            </p>
            <WouterLink href="/auth?tab=register">
              <Button size="lg" className="text-base px-8" data-testid="button-create-page">
                Create your page
                <ArrowRight className="w-4 h-4" />
              </Button>
            </WouterLink>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm text-muted-foreground">
            linkfolio
          </span>
          <span className="text-sm text-muted-foreground">
            Built with care
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-8 rounded-xl bg-background border border-border/50">
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
