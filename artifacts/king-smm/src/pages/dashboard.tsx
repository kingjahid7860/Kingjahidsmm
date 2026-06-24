import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ShoppingCart, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });

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
    { title: "Available Balance", value: `₹${stats?.balance?.toFixed(2) || '0.00'}`, icon: Wallet, color: "text-primary" },
    { title: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingCart, color: "text-blue-400" },
    { title: "Completed Orders", value: stats?.completedOrders || 0, icon: CheckCircle, color: "text-green-400" },
    { title: "Pending Orders", value: stats?.pendingOrders || 0, icon: Clock, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here is your overview.</p>
      </div>

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
                      <Badge variant="outline" className={
                        order.status === 'completed' ? 'text-green-400 border-green-400/30' : 
                        order.status === 'pending' ? 'text-accent border-accent/30' : ''
                      }>
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
    </div>
  );
}
