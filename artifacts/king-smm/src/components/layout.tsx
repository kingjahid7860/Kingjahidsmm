import React from "react";
import { Link, useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Home, List, PlusCircle, History, Wallet, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-9.893c-3.037-.013-5.561 2.063-6.213 4.904-.25 1.054-.167 2.124.237 3.115l-1.523 5.556 5.68-1.49c1.023.43 2.143.659 3.272.66h.003c3.037 0 5.561-2.062 6.214-4.904.947-3.985-2.071-7.84-5.88-7.84m-.003 14.32h-.002c-1.006 0-1.996-.274-2.86-.788l-.205-.122-3.032.796.81-2.951-.19-.302a4.968 4.968 0 0 1-.758-2.643c0-3.005 2.445-5.45 5.45-5.45 3.005 0 5.45 2.445 5.45 5.45 0 3.005-2.445 5.45-5.45 5.45"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/new-order", label: "New Order", icon: PlusCircle },
  { href: "/services", label: "Services", icon: List },
  { href: "/orders", label: "Orders", icon: History },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useFirebaseAuth();
  const [location, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  const displayName = user?.displayName || user?.email || "User";
  const initial = displayName[0]?.toUpperCase() ?? "U";

  const NavLinks = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const active = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                active ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white">K</div>
          <span className="font-bold text-lg tracking-tight">kingsmmpanel</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-card border-r-border">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white">K</div>
                  <span className="font-bold text-lg tracking-tight">kingsmmpanel</span>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto"><NavLinks /></nav>
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 mb-4 px-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">{initial}</div>
                  <span className="truncate">{displayName}</span>
                </div>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]">K</div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">kingsmmpanel</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto"><NavLinks /></nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary border border-primary/30">{initial}</div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      <a
        href="https://wa.me/918002035977"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-3 rounded-full shadow-lg shadow-green-500/30 transition-all hover:scale-105"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Support</span>
      </a>
    </div>
  );
}
