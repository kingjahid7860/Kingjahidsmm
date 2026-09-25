import { useState } from "react";
import { useListServices, getListServicesQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Services({ compact = false }: { compact?: boolean }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  
  const { data: services, isLoading } = useListServices(
    category !== "all" ? { category } : undefined,
    { query: { queryKey: getListServicesQueryKey(category !== "all" ? { category } : undefined) } }
  );

  const categories = Array.from(new Set(services?.map(s => s.category) || []));
  const filteredServices = services?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.platform.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {!compact && <div>
        <h1 className="text-3xl font-bold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1">Browse our complete catalog of growth services.</p>
      </div>}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search services..." 
            className="pl-9 bg-card/50 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
         </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-white/10">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card/50 border-white/5 overflow-hidden backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-border">
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Price per 1k</TableHead>
                <TableHead className="text-right">Min / Max</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredServices?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No services found.</TableCell></TableRow>
              ) : (
                filteredServices?.map(service => (
                  <TableRow key={service.id} className="border-border hover:bg-white/5">
                    <TableCell className="font-mono text-muted-foreground">#{service.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{service.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs bg-white/5">{service.platform}</Badge>
                        <span className="text-xs text-muted-foreground">{service.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary font-bold">
                      ₹{service.pricePerThousand.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {service.minQuantity} / {service.maxQuantity}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" asChild variant="outline" className="border-primary/50 hover:bg-primary/20 hover:text-primary">
                        <Link href={`/new-order?service=${service.id}`}>Order</Link>
                      </Button>
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
