import { useEffect, useRef, useState } from "react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ShoppingCart, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ref, onValue } from "firebase/database";
import { rtdb, type FeedItem } from "@/lib/firebase";

// ─── Video helpers ────────────────────────────────────────────────────────────

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

  // Unknown URLs are still rendered as embeds, but never let a malformed
  // value become an invalid iframe source.
  try {
    new URL(url);
    return { type: "iframe", embedUrl: url };
  } catch {
    return { type: "iframe", embedUrl: undefined };
  }
}

// ─── Instagram embed component ───────────────────────────────────────────────

function InstagramEmbed({ url }: { url: string }) {
  const ref2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref2.current) return;
    const existing = document.getElementById("ig-embed-script");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "ig-embed-script";
      s.src = "https://www.instagram.com/embed.js";
      s.async = true;
      document.body.appendChild(s);
    } else {
      (window as any).instgrm?.Embeds?.process();
    }
  }, [url]);

  const clean = url.split("?")[0].replace(/\/$/, "");
  return (
    <div ref={ref2} className="flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={`${clean}/?utm_source=ig_embed`}
        data-instgrm-version="14"
        style={{ maxWidth: 540, width: "100%", margin: "0 auto" }}
      />
    </div>
  );
}

// ─── Video player ─────────────────────────────────────────────────────────────

function VideoPlayer({ url }: { url: string }) {
  const { type, embedUrl } = getVideoEmbed(url);

  if (type === "direct") {
    return (
      <video controls className="w-full rounded-xl max-h-[420px] bg-black">
        <source src={embedUrl} />
        Your browser does not support video.
      </video>
    );
  }

  if (type === "instagram") {
    return <InstagramEmbed url={url} />;
  }

  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full rounded-xl"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// ─── Feed card ────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="bg-card/50 border border-white/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
        </span>
        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Admin Update</span>
      </div>

      {item.text && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
      )}

      {item.imageBase64 && (
        <img
          src={item.imageBase64}
          alt="Broadcast image"
          className="w-full max-h-[400px] object-contain rounded-lg border border-white/5"
        />
      )}

      {item.videoUrl && (
        <div className="rounded-xl overflow-hidden">
          <VideoPlayer url={item.videoUrl} />
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  // Real-time feed from Firebase RTDB
  useEffect(() => {
    const feedRef = ref(rtdb, "dashboard_feed");
    const unsub = onValue(feedRef, (snap) => {
      if (!snap.exists()) { setFeedItems([]); return; }
      const items: FeedItem[] = [];
      snap.forEach((child) => {
        items.push({ id: child.key!, ...(child.val() as Omit<FeedItem, "id">) });
        return false;
      });
      // oldest first so feed reads top-to-bottom chronologically
      items.sort((a, b) => a.timestamp - b.timestamp);
      setFeedItems(items);
    });
    return () => unsub();
  }, []);

  // Find the latest video URL from any feed item
  const latestVideoItem = [...feedItems].reverse().find((item) => item.videoUrl);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Available Balance", value: `₹${stats?.balance?.toFixed(2) || "0.00"}`, icon: Wallet, color: "text-primary" },
    { title: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingCart, color: "text-blue-400" },
    { title: "Completed Orders", value: stats?.completedOrders || 0, icon: CheckCircle, color: "text-green-400" },
    { title: "Pending Orders", value: stats?.pendingOrders || 0, icon: Clock, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back. Here is your overview.</p>
          </div>
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent text-white">
            <Link href="/new-order">New Order <ShoppingCart className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* TOP: Video player — only shown when there's a videoUrl in the feed */}
      {latestVideoItem?.videoUrl && (
        <Card className="bg-card/50 border-white/5 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <VideoPlayer url={latestVideoItem.videoUrl} />
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="bg-card/50 border-white/5 backdrop-blur overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <card.icon className="w-16 h-16" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>ID</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id} className="border-border">
                    <TableCell className="font-mono text-muted-foreground">#{order.id}</TableCell>
                    <TableCell className="font-medium">{order.serviceName}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">{order.link}</TableCell>
                    <TableCell>₹{order.charge.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          order.status === "Completed"
                            ? "text-green-400 border-green-400/30"
                            : order.status === "Pending"
                            ? "text-accent border-accent/30"
                            : ""
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No recent orders found.</div>
          )}
        </CardContent>
      </Card>

      {/* BOTTOM: Live feed — only shown when there are feed items */}
      {feedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Admin Feed
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="space-y-3">
            {feedItems.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
