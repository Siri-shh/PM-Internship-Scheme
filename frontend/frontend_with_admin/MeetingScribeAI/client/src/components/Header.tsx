// client/src/components/Header.tsx
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, GraduationCap, Building2, Shield, Home } from "lucide-react";

interface HeaderProps {
  showNav?: boolean;
}

export function Header({ showNav = true }: HeaderProps) {
  const [language, setLanguage] = useState("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // track currently selected portal (student | company | admin) or null
  const [portalSelected, setPortalSelected] = useState<string | null>(null);

  useEffect(() => {
    // read sessionStorage safely
    try {
      setPortalSelected(sessionStorage.getItem("portalSelected"));
    } catch {
      setPortalSelected(null);
    }

    // also observe storage events if other tabs modify it
    function onStorage(e: StorageEvent) {
      if (e.key === "portalSelected") {
        try {
          setPortalSelected(sessionStorage.getItem("portalSelected"));
        } catch {
          setPortalSelected(null);
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/student", label: "Student Portal", icon: GraduationCap },
    { href: "/company", label: "Company Portal", icon: Building2 },
    { href: "/admin", label: "Admin Portal", icon: Shield },
  ];

  function leavePortal() {
    try {
      sessionStorage.removeItem("portalSelected");
    } catch {}
    // ensure we navigate and replace history so back doesn't return to a portal
    window.location.replace("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" data-testid="link-home">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">PM Internship Scheme</span>
              <span className="text-xs text-muted-foreground">Government of India</span>
            </div>
          </Link>

          {showNav && (
            // If inside a portal, show portal label + back button. Otherwise show full nav.
            <nav className="hidden md:flex items-center gap-1">
              {portalSelected ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 capitalize">{portalSelected} portal</span>
                  <Button
                    onClick={leavePortal}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    data-testid="nav-back-home"
                  >
                    Back to Home
                  </Button>
                </div>
              ) : (
                navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={location === item.href ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))
              )}
            </nav>
          )}

          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-24" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
              </SelectContent>
            </Select>

            <ThemeToggle />

            {showNav && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile nav: apply same portalSelected logic */}
        {mobileMenuOpen && showNav && (
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            {portalSelected ? (
              <div className="flex items-center gap-2 px-2">
                <span className="text-sm text-gray-600 capitalize">{portalSelected} portal</span>
                <Button onClick={() => { setMobileMenuOpen(false); leavePortal(); }} className="ml-auto">
                  Back to Home
                </Button>
              </div>
            ) : (
              navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
