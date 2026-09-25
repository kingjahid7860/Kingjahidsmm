import React from "react";
import { Link, useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, LogOut, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useFirebaseAuth();
  const [location] = useLocation();
  const isActive = (href: string) => location === href;

  const links = (
    <>
      <Link href="/services">
        <span className={isActive("/services") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground cursor-pointer"}>
          Services
        </span>
      </Link>
      <Link href="/new-order">
        <span className={isActive("/new-order") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground cursor-pointer"}>
          New Order
        </span>
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/">
            <span className="flex cursor-pointer items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-bold text-white shadow-lg shadow-primary/20">K</span>
              <span className="font-bold tracking-tight">kingsmmpanel</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">{links}</nav>

          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <span className="hidden max-w-32 truncate text-xs text-muted-foreground lg:inline">{user?.email}</span>
                <Button asChild variant="outline" size="sm"><Link href="/dashboard">Dashboard</Link></Button>
                <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
                <Button asChild size="sm"><Link href="/register">Register</Link></Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Open menu"><Menu className="h-4 w-4" /></Button></SheetTrigger>
              <SheetContent className="bg-card" side="right">
                <div className="mt-8 flex flex-col gap-5 text-base">
                  <Link href="/"><span className="cursor-pointer">Home</span></Link>
                  {links}
                  {isAuthenticated ? (
                    <>
                      <Link href="/dashboard"><span className="cursor-pointer">Dashboard</span></Link>
                      <Button variant="ghost" className="justify-start px-0" onClick={logout}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login"><span className="cursor-pointer text-primary">Login</span></Link>
                      <Link href="/register"><span className="cursor-pointer text-primary">Register</span></Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Real social growth services, simple ordering.</p>
      </footer>
    </div>
  );
}