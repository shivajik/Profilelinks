import { useLocation } from "wouter";
import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import logoPath from "/logo.png";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <WouterLink href="/">
          <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain cursor-pointer" />
        </WouterLink>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[120px] font-black text-primary/15 leading-none select-none mb-2">
          404
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground max-w-md mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Button variant="outline" onClick={() => navigate(-1 as any)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-2" /> Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/support")}>
            <Search className="h-4 w-4 mr-2" /> Support
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} VisiCardly. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
