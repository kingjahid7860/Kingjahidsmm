import React from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-8 md:p-12 backdrop-blur-sm bg-card/80 border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white text-3xl shadow-[0_0_30px_rgba(236,72,153,0.5)] mb-6">
          K
        </div>
        <h1 className="text-4xl font-bold mb-2 tracking-tight">kingsmmpanel</h1>
        <p className="text-muted-foreground mb-8">The premium SMM panel for social media growth.</p>
        
        <Button 
          size="lg" 
          className="w-full text-lg h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all border-0" 
          onClick={login}
        >
          Access Command Center
        </Button>
      </div>
    </div>
  );
}
