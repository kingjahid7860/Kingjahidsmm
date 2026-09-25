import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardStats,
  useListServices,
  useCreateOrder,
  getGetDashboardStatsQueryKey,
  getListServicesQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Layers3,
  Link2,
  Loader2,
  Megaphone,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { ref, onValue } from "firebase/database";
import { rtdb, type FeedItem } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Service } from "@workspace/api-client-react";

function getVideoEmbed(url: string): { type: string; embedUrl?: string } {
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/live\/|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i,
  );
  if (ytMatch) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
  if (url.match(/(?:facebook\.com|fb\.watch)\//i)) {
    return {
      type: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=640&autoplay=false`,
    };
  }
  if (url.match(/instagram\.com\/(p|reel)\//)) return { type: "instagram", embedUrl: url };
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return { type: "direct", embedUrl: url };
  try {
    new URL(url);
    return { type: "iframe", embedUrl: url };
  } catch {
    return { type: "iframe" };
  }
}

function InstagramEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const existing = document.getElementById("ig-embed-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "ig-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      (window as typeof window & { instgrm?: { Embeds?: { process?: () => void } } }).instgrm?.Embeds?.process?.();
    }
  }, [url]);

  const clean = url.split("?")[0].replace(/\/$/, "");
  return (
    <div ref={containerRef} className="flex justify-center overflow-hidden rounded-xl">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={`${clean}/?utm_source=ig_embed`}
        data-instgrm-version="14"
        style={{ maxWidth: 540, width: "100%", margin: "0 auto" }}
      />
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const { type, embedUrl } = getVideoEmbed(url);
  if (!embedUrl) {
    return <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Media preview unavailable.</div>;
  }
  if (type === "direct") {
    return (
      <video controls className="max-h-[360px] w-full rounded-xl bg-black/80">
        <source src={embedUrl} />
        Your browser does not support video.
      </video>
    );
  }
  if (type === "instagram") return <InstagramEmbed url={url} />;
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black/20" style={{ paddingTop: "56.25%" }}>
      <iframe
        title="Admin video update"
        src={embedUrl}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <article className="space-y-3 rounded-2xl border border-border/70 bg-background/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Admin update
        </div>
        <time className="text-[11px] text-muted-foreground">
          {new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </div>
      {item.text && <p className="whitespace-pre-wrap text-sm leading-6">{item.text}</p>}
      {item.imageBase64 && (
        <img src={item.imageBase64} alt="Admin update" className="max-h-[340px] w-full rounded-xl border border-border/60 object-contain" />
      )}
      {item.videoUrl && <VideoPlayer url={item.videoUrl} />}
    </article>
  );
}

function formatMoney(value: number | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("complete")) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
  if (normalized.includes("pending") || normalized.includes("process")) return "border-amber-500/25 bg-amber-500/10 text-amber-500";
  if (normalized.includes("cancel") || normalized.includes("fail")) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted/60 text-muted-foreground";
}

function ServiceRow({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        selected
          ? "border-primary/45 bg-primary/[0.08] shadow-[inset_3px_0_0_hsl(var(--primary))]"
          : "border-border/65 bg-background/25 hover:border-primary/25 hover:bg-primary/[0.04]"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {service.platform.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{service.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{service.category} · {service.platform}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-xs font-bold text-primary">₹{Number(service.pricePerThousand).toFixed(2)}</span>
        <span className="block text-[10px] text-muted-foreground">per 1,000</span>
      </span>
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${selected ? "translate-x-0.5 text-primary" : "text-muted-foreground/50"}`} />
    </button>
  );
}

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/65 bg-background/30 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{detail}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const {
    data: services,
    isLoading: servicesLoading,
    isError: servicesError,
    refetch: refetchServices,
  } = useListServices(undefined, { query: { queryKey: getListServicesQueryKey() } });
  const createOrder = useCreateOrder();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedState, setFeedState] = useState<"connecting" | "live" | "empty">("connecting");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const feedRef = ref(rtdb, "dashboard_feed");
    const unsubscribe = onValue(
      feedRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setFeedItems([]);
          setFeedState("empty");
          return;
        }
        const items: FeedItem[] = [];
        snapshot.forEach((child) => {
          items.push({ id: child.key!, ...(child.val() as Omit<FeedItem, "id">) });
          return false;
        });
        items.sort((a, b) => b.timestamp - a.timestamp);
        setFeedItems(items);
        setFeedState(items.length ? "live" : "empty");
      },
      () => setFeedState("empty"),
    );
    return () => unsubscribe();
  }, []);

  const activeServices = useMemo(() => (services || []).filter((service) => service.isActive), [services]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(activeServices.map((service) => service.category).filter(Boolean))).sort()],
    [activeServices],
  );
  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    return activeServices.filter((service) => {
      const matchesCategory = category === "All" || service.category === category;
      const matchesQuery =
        !query ||
        [service.name, service.category, service.platform, service.description, String(service.id)].some((value) =>
          value.toLowerCase().includes(query),
        );
      return matchesCategory && matchesQuery;
    });
  }, [activeServices, category, serviceSearch]);
  const selectedService = activeServices.find((service) => Number(service.id) === Number(serviceId));
  const quantityNumber = Number(quantity);
  const charge = selectedService && Number.isFinite(quantityNumber) && quantityNumber > 0
    ? (Number(selectedService.pricePerThousand) / 1000) * quantityNumber
    : 0;

  useEffect(() => {
    if (!serviceId && activeServices.length) {
      setServiceId(Number(activeServices[0].id));
      setQuantity(String(activeServices[0].minQuantity));
    }
  }, [activeServices, serviceId]);

  function selectService(nextService: Service) {
    setServiceId(Number(nextService.id));
    setQuantity(String(nextService.minQuantity));
    setFormError("");
  }

  function submitOrder() {
    if (!selectedService) {
      setFormError("Choose a service to continue.");
      return;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(link.trim());
    } catch {
      setFormError("Enter a valid destination URL.");
      return;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setFormError("Use a secure web link beginning with http or https.");
      return;
    }
    if (!Number.isInteger(quantityNumber)) {
      setFormError("Quantity must be a whole number.");
      return;
    }
    if (quantityNumber < Number(selectedService.minQuantity) || quantityNumber > Number(selectedService.maxQuantity)) {
      setFormError(`Quantity must be between ${Number(selectedService.minQuantity).toLocaleString()} and ${Number(selectedService.maxQuantity).toLocaleString()}.`);
      return;
    }
    setFormError("");
    createOrder.mutate(
      { data: { serviceId: Number(selectedService.id), link: link.trim(), quantity: quantityNumber } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast({ title: "Order placed", description: "Your order is now in the activity queue." });
          setLocation("/orders");
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "We could not place the order. Try again.";
          setFormError(message);
          toast({ title: "Order not placed", description: message, variant: "destructive" });
        },
      },
    );
  }

  const statTiles = [
    { label: "Orders completed", value: stats?.completedOrders || 0, detail: "Delivered", icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-500" },
    { label: "Orders in progress", value: stats?.pendingOrders || 0, detail: "In queue", icon: Clock3, tone: "bg-amber-500/10 text-amber-500" },
    { label: "Lifetime orders", value: stats?.totalOrders || 0, detail: "All time", icon: PackageCheck, tone: "bg-primary/10 text-primary" },
    { label: "Total investment", value: formatMoney(stats?.totalSpent), detail: "All time", icon: Activity, tone: "bg-sky-500/10 text-sky-500" },
  ];

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-56" /></div>
          <Skeleton className="hidden h-12 w-40 rounded-xl sm:block" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]"><Skeleton className="h-[560px] rounded-3xl" /><Skeleton className="h-[560px] rounded-3xl" /></div>
      </div>
    );
  }

  if (statsError) {
    return (
      <Card className="border-destructive/25 bg-destructive/[0.04]">
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <CircleAlert className="mb-4 h-8 w-8 text-destructive" />
          <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">We could not load your account overview. Your session is safe; try refreshing the dashboard.</p>
          <Button className="mt-5" onClick={() => void refetchStats()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-5 pb-8">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary/[0.06] blur-3xl" />
      <header className="relative flex flex-col justify-between gap-5 border-b border-border/60 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/.12)]" />
            King SMM · Control center
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Good to see you. What are we moving today?</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Pick a service, add your destination, and send growth into motion without leaving this desk.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground sm:self-auto">
          <span className={`h-2 w-2 rounded-full ${feedState === "live" ? "bg-emerald-500" : "bg-amber-500"}`} />
          {feedState === "live" ? "Admin feed live" : "Checking updates"}
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
        <Card className="overflow-hidden border-primary/20 bg-card/70 shadow-[0_24px_60px_hsl(var(--primary)/.08)]">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.11] via-transparent to-transparent p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Zap className="h-3.5 w-3.5" /> Quick order</div>
                <h2 className="text-2xl font-semibold tracking-tight">Put your next campaign to work.</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">Live rates, clear limits, one focused checkout.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Available balance</div>
                <div className="mt-0.5 text-lg font-semibold text-primary">{formatMoney(stats?.balance)}</div>
              </div>
            </div>
          </div>
          <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(260px,.86fr)_minmax(0,1.14fr)]">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Choose a service</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{activeServices.length} active options</p>
                </div>
                <Link href="/services" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Full catalog <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Search service, platform, or ID" className="h-10 border-border/70 bg-background/40 pl-9 text-sm" />
                {serviceSearch && <button type="button" aria-label="Clear search" onClick={() => setServiceSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="max-h-[292px] space-y-2 overflow-y-auto pr-1">
                {servicesLoading ? (
                  [1, 2, 3].map((item) => <Skeleton key={item} className="h-[65px] w-full rounded-xl" />)
                ) : servicesError ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 text-sm text-muted-foreground">
                    <p>Services could not be loaded.</p>
                    <Button variant="link" className="mt-1 h-auto px-0 text-xs" onClick={() => void refetchServices()}>Try again</Button>
                  </div>
                ) : filteredServices.length ? (
                  filteredServices.map((service) => <ServiceRow key={service.id} service={service} selected={Number(service.id) === Number(serviceId)} onSelect={() => selectService(service)} />)
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No active services match that search.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/35 p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Order details</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Selected service is ready to configure.</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShoppingBag className="h-4 w-4" /></span>
              </div>
              {selectedService ? (
                <>
                  <div className="mb-5 rounded-xl border border-primary/20 bg-primary/[0.06] p-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{selectedService.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{selectedService.description || "Reliable delivery for your next campaign."}</div>
                      </div>
                      <div className="shrink-0 text-right font-mono text-sm font-bold text-primary">₹{Number(selectedService.pricePerThousand).toFixed(2)}<span className="block font-sans text-[10px] font-normal text-muted-foreground">per 1k</span></div>
                    </div>
                    <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                      <span>Min <strong className="text-foreground">{Number(selectedService.minQuantity).toLocaleString()}</strong></span>
                      <span>Max <strong className="text-foreground">{Number(selectedService.maxQuantity).toLocaleString()}</strong></span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Destination link</span>
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={link} onChange={(event) => { setLink(event.target.value); setFormError(""); }} placeholder="https://your-post-or-profile.com" className="h-11 border-border/70 bg-card/60 pl-9" />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Quantity</span>
                      <Input type="number" inputMode="numeric" min={Number(selectedService.minQuantity)} max={Number(selectedService.maxQuantity)} value={quantity} onChange={(event) => { setQuantity(event.target.value); setFormError(""); }} className="h-11 border-border/70 bg-card/60 font-mono" />
                      <span className="mt-1.5 block text-[11px] text-muted-foreground">Between {Number(selectedService.minQuantity).toLocaleString()} and {Number(selectedService.maxQuantity).toLocaleString()}</span>
                    </label>
                    {formError && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2.5 text-xs text-destructive"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{formError}</div>}
                    <div className="flex items-end justify-between gap-4 border-t border-border/60 pt-4">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estimated charge</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight">{formatMoney(charge)}</div>
                      </div>
                      <Button type="button" onClick={submitOrder} disabled={createOrder.isPending} className="h-11 min-w-[142px] rounded-xl">
                        {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {createOrder.isPending ? "Placing…" : "Place order"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-muted-foreground">
                  <Layers3 className="mb-3 h-8 w-8 opacity-50" />
                  <p className="text-sm font-medium text-foreground">Select a service to begin.</p>
                  <p className="mt-1 max-w-[220px] text-xs leading-5">Your rate, limits, and live estimate will appear here.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card className="border-border/70 bg-card/65">
            <CardContent className="p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Wallet className="h-3.5 w-3.5 text-primary" /> Wallet</div>
                  <div className="text-3xl font-semibold tracking-tight">{formatMoney(stats?.balance)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Ready for your next order</p>
                </div>
                <Link href="/wallet" className="flex h-8 items-center gap-1 rounded-lg border border-border/70 px-2.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary">Add funds <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-background/35 px-3 py-2.5 text-[11px]">
                <span className="text-muted-foreground">Lifetime spent</span>
                <span className="font-mono font-semibold text-foreground">{formatMoney(stats?.totalSpent)}</span>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            {statTiles.map((tile) => <StatTile key={tile.label} {...tile} />)}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card className="border-border/70 bg-card/60">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2"><h2 className="text-base font-semibold">Recent activity</h2><Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">{stats?.recentOrders?.length || 0} latest</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">A quick read on your latest campaigns.</p>
            </div>
            <Link href="/orders" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ExternalLink className="h-3.5 w-3.5" /></Link>
          </div>
          <CardContent className="p-0">
            {stats?.recentOrders?.length ? (
              <div className="divide-y divide-border/60">
                {stats.recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><ShoppingBag className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{order.serviceName}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">#{order.id} · {order.link}</div>
                    </div>
                    <div className="shrink-0 text-right"><div className="font-mono text-sm">{formatMoney(order.charge)}</div><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(order.status)}`}>{order.status}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[190px] flex-col items-center justify-center px-6 text-center text-muted-foreground"><ShoppingBag className="mb-3 h-7 w-7 opacity-40" /><p className="text-sm font-medium text-foreground">Your activity will appear here.</p><p className="mt-1 text-xs">Place your first order from the quick order panel.</p></div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
             <div><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /><h2 className="text-base font-semibold">From the desk</h2></div><p className="mt-1 text-xs text-muted-foreground">Live updates from King SMM.</p></div>
             <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${feedState === "live" ? "text-emerald-500" : "text-muted-foreground"}`}><span className={`h-1.5 w-1.5 rounded-full ${feedState === "live" ? "bg-emerald-500" : "bg-muted-foreground"}`} /> {feedState === "live" ? "Live" : "Standby"}</div>
          </div>
          <CardContent className="space-y-3 p-4">
            {feedItems.length ? feedItems.slice(0, 2).map((item) => <FeedCard key={item.id} item={item} />) : (
              <div className="flex min-h-[190px] flex-col items-center justify-center text-center text-muted-foreground"><Sparkles className="mb-3 h-7 w-7 opacity-40" /><p className="text-sm font-medium text-foreground">No updates yet.</p><p className="mt-1 max-w-[230px] text-xs leading-5">New announcements and media from the admin team will land here.</p></div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}