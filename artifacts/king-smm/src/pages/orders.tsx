import { useState } from "react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function Orders() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useListOrders(
    { 
      status: status !== "all" ? status : undefined,
      search: search || undefined
    },
    { query: { queryKey: getListOrdersQueryKey({ status: status !== "all" ? status : undefined, search: search || undefined }) } }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
        <p className="text-muted-foreground mt-1">Track and manage your requested services.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by link or service..." 
            className="pl-9 bg-card/50 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-white/10">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card/50 border-white/5 overflow-hidden backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-border">
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Charge</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.orders.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found.</TableCell></TableRow>
              ) : (
                data?.orders.map(order => (
                  <TableRow key={order.id} className="border-border hover:bg-white/5">
                    <TableCell className="font-mono text-muted-foreground">#{order.id}</TableCell>
                    <TableCell className="text-sm">{format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <a href={order.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{order.link}</a>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">₹{order.charge.toFixed(2)}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{order.serviceName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        order.status === 'completed' ? 'text-green-400 border-green-400/30' : 
                        order.status === 'canceled' ? 'text-destructive border-destructive/30' :
                        order.status === 'pending' ? 'text-accent border-accent/30' : 
                        'text-blue-400 border-blue-400/30'
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
