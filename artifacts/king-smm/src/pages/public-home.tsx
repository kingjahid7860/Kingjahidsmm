import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicLayout from "@/components/public-layout";
import Services from "@/pages/services";

export default function PublicHome() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-[1.1fr_.9fr] md:items-center md:px-8 md:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Sparkles className="h-4 w-4" /> Grow with confidence
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">Social growth services that move at your pace.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Browse transparent pricing, choose the service you need, and place your first order in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/services">Browse services <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/register">Create free account</Link></Button>
            </div>
          </div>
          <Card className="relative overflow-hidden border-primary/20 bg-card/80 shadow-2xl shadow-primary/10">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {[
                { icon: Gauge, title: "Fast delivery", body: "Start campaigns quickly." },
                { icon: ShieldCheck, title: "Clear pricing", body: "Know your rate before ordering." },
                { icon: CheckCircle2, title: "Live status", body: "Track progress from your dashboard." },
                { icon: Sparkles, title: "Many platforms", body: "Find the right service in one catalog." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-border bg-background/60 p-4">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Service catalog</p>
            <h2 className="mt-2 text-3xl font-bold">Find your next growth service</h2>
          </div>
          <Button asChild variant="outline"><Link href="/services">See all services <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        <Services compact />
      </section>
    </PublicLayout>
  );
}