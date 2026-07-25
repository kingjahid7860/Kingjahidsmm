import React, { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetAdminStats,
  useListAdminUsers,
  useListAdminOrders,
  useListAdminTopups,
  useGetPaymentSettings,
  useUpdateUserBalance,
  useUpdateOrderStatus,
  useUpdateTopupStatus,
  useUpdatePaymentSettings,
  useListAdminServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useGetApiSettings,
  useUpdateApiSettings,
  getGetAdminStatsQueryKey,
  getListAdminUsersQueryKey,
  getListAdminOrdersQueryKey,
  getListAdminTopupsQueryKey,
  getGetPaymentSettingsQueryKey,
  getListAdminServicesQueryKey,
  getGetApiSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Users, ShoppingCart, Wallet, Clock, Settings, ChevronLeft, ChevronRight, Shield, Edit2, Check, X, Plus, Trash2, Link, Key, ToggleLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_USER_ID = "61264607";
const ADMIN_EMAIL = "kingjahid0786@gmail.com";

type Tab = "dashboard" | "users" | "orders" | "topups" | "services" | "api" | "settings";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Completed: "text-green-400 border-green-400/30 bg-green-400/10",
    Approved: "text-green-400 border-green-400/30 bg-green-400/10",
    Pending: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    Processing: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    Cancelled: "text-red-400 border-red-400/30 bg-red-400/10",
    Rejected: "text-red-400 border-red-400/30 bg-red-400/10",
  };
  return (
    <Badge variant="outline" className={colorMap[status] ?? ""}>
      {status}
    </Badge>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mt-4">
      <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
        if (p < 1 || p > totalPages) return null;
        return (
          <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" onClick={() => onPage(p)}>
            {p}
          </Button>
        );
      })}
      <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function DashboardTab() {
  const { data: stats, isLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const cards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { title: "Total Balance", value: `\u20B9${(stats?.totalBalance ?? 0).toFixed(2)}`, icon: Wallet, color: "text-green-400" },
    { title: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: "text-blue-400" },
    { title: "Pending Top-ups", value: stats?.pendingTopups ?? 0, icon: Clock, color: "text-amber-400" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="bg-card/50 border-white/5 backdrop-blur relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <c.icon className="w-16 h-16" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${c.color}`}>{isLoading ? "\u2014" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useListAdminUsers({ query: { queryKey: getListAdminUsersQueryKey() } });
  const { mutateAsync: updateBalance } = useUpdateUserBalance();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState("");

  async function handleSave(userId: string) {
    const balance = Number(balanceInput);
    if (isNaN(balance)) return;
    try {
      await updateBalance({ id: userId, data: { balance } });
      await qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      toast({ title: "Balance updated" });
      setEditId(null);
    } catch {
      toast({ title: "Failed to update balance", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Users ({users?.length ?? 0})</h2>
      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users yet.</TableCell></TableRow>
              ) : users?.map((u) => (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="text-sm">{u.email ?? "\u2014"}</TableCell>
                  <TableCell className="text-sm">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "\u2014"}</TableCell>
                  <TableCell>
                    {editId === u.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={balanceInput}
                          onChange={(e) => setBalanceInput(e.target.value)}
                          className="w-24 h-7 text-sm"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400" onClick={() => handleSave(u.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => setEditId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-medium text-green-400">\u20B9{u.balance.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>{u.totalOrders}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(u.id); setBalanceInput(String(u.balance)); }}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit Balance
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const limit = 15;
  const { data, isLoading } = useListAdminOrders(
    { page, limit, status: statusFilter === "all" ? undefined : statusFilter },
    { query: { queryKey: getListAdminOrdersQueryKey({ page, limit, status: statusFilter }) } },
  );
  const { mutateAsync: updateStatus } = useUpdateOrderStatus();
  const qc = useQueryClient();
  const { toast } = useToast();

  async function handleStatusChange(orderId: number, status: string) {
    try {
      await updateStatus({ id: orderId, data: { status } });
      await qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      toast({ title: `Order #${orderId} marked as ${status}` });
    } catch {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">All Orders ({data?.total ?? 0})</h2>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 bg-card/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data?.orders.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found.</TableCell></TableRow>
              ) : data?.orders.map((o) => (
                <TableRow key={o.id} className="border-border">
                  <TableCell className="font-mono text-muted-foreground">#{o.id}</TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate">{o.userEmail ?? o.userId.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm max-w-[140px] truncate">{o.serviceName}</TableCell>
                  <TableCell>{o.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-primary font-medium">\u20B9{o.charge.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(o.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-right">
                    <Select value={o.status} onValueChange={(v) => handleStatusChange(o.id, v)}>
                      <SelectTrigger className="w-32 h-7 text-xs bg-card border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

function TopupsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const limit = 15;
  const { data, isLoading } = useListAdminTopups(
    { page, limit, status: statusFilter === "all" ? undefined : statusFilter },
    { query: { queryKey: getListAdminTopupsQueryKey({ page, limit, status: statusFilter }) } },
  );
  const { mutateAsync: updateStatus } = useUpdateTopupStatus();
  const qc = useQueryClient();
  const { toast } = useToast();

  async function handleAction(id: number, status: "Approved" | "Rejected") {
    try {
      await updateStatus({ id, data: { status } });
      await qc.invalidateQueries({ queryKey: getListAdminTopupsQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: status === "Approved" ? "Top-up approved \u2014 balance added to user wallet" : "Top-up rejected" });
    } catch {
      toast({ title: "Failed to update topup", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Top-up Requests ({data?.total ?? 0})</h2>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 bg-card/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data?.topups.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No top-up requests found.</TableCell></TableRow>
              ) : data?.topups.map((t) => (
                <TableRow key={t.id} className="border-border">
                  <TableCell className="font-mono text-muted-foreground">#{t.id}</TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate">{t.userEmail ?? t.userId.slice(0, 8)}</TableCell>
                  <TableCell className="font-bold text-green-400">\u20B9{t.amount.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">{t.transactionId}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(t.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell className="text-right">
                    {t.status === "Pending" ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-7 px-2"
                          onClick={() => handleAction(t.id, "Approved")}>
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 px-2"
                          onClick={() => handleAction(t.id, "Rejected")}>
                          <X className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">\u2014</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

const PLATFORMS = ["Instagram", "YouTube", "Facebook", "Twitter/X", "TikTok", "Telegram", "Other"];

const emptyService = { name: "", category: "", platform: "Instagram", description: "", pricePerThousand: 0, minQuantity: 100, maxQuantity: 100000 };

function ServicesTab() {
  const { data: services, isLoading } = useListAdminServices({ query: { queryKey: getListAdminServicesQueryKey() } });
  const { mutateAsync: createService } = useCreateService();
  const { mutateAsync: updateService } = useUpdateService();
  const { mutateAsync: deleteService } = useDeleteService();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyService });

  function openAdd() { setForm({ ...emptyService }); setShowAdd(true); }
  function openEdit(s: NonNullable<typeof services>[0]) {
    setForm({ name: s.name, category: s.category, platform: s.platform, description: s.description, pricePerThousand: s.pricePerThousand, minQuantity: s.minQuantity, maxQuantity: s.maxQuantity });
    setEditId(s.id);
  }

  async function handleSave() {
    const data = { ...form, pricePerThousand: Number(form.pricePerThousand), minQuantity: Number(form.minQuantity), maxQuantity: Number(form.maxQuantity) };
    if (!data.name || !data.category || !data.platform || !data.description || !data.pricePerThousand) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    try {
      if (editId !== null) {
        await updateService({ id: editId, data });
        toast({ title: "Service updated" });
        setEditId(null);
      } else {
        await createService({ data });
        toast({ title: "Service added" });
        setShowAdd(false);
      }
      await qc.invalidateQueries({ queryKey: getListAdminServicesQueryKey() });
    } catch {
      toast({ title: "Failed to save service", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteService({ id });
      await qc.invalidateQueries({ queryKey: getListAdminServicesQueryKey() });
      toast({ title: "Service deactivated" });
    } catch {
      toast({ title: "Failed to deactivate service", variant: "destructive" });
    }
  }

  const ServiceForm = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Service Name *</label>
          <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Instagram Followers" className="bg-background/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Platform *</label>
          <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v }))}>
            <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
            <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category *</label>
          <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Followers" className="bg-background/50" />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description *</label>
          <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" className="bg-background/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Price per 1000 (\u20B9) *</label>
          <Input type="number" value={form.pricePerThousand} onChange={(e) => setForm(f => ({ ...f, pricePerThousand: Number(e.target.value) }))} placeholder="e.g. 50" className="bg-background/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Min Quantity</label>
          <Input type="number" value={form.minQuantity} onChange={(e) => setForm(f => ({ ...f, minQuantity: Number(e.target.value) }))} className="bg-background/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Max Quantity</label>
          <Input type="number" value={form.maxQuantity} onChange={(e) => setForm(f => ({ ...f, maxQuantity: Number(e.target.value) }))} className="bg-background/50" />
        </div>
      </div>
      <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-accent text-white w-full">
        {editId !== null ? "Save Changes" : "Add Service"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Services ({services?.length ?? 0})</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent text-white" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 max-w-md">
            <DialogHeader><DialogTitle>Add New Service</DialogTitle></DialogHeader>
            <ServiceForm />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editId !== null} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent className="bg-card border-white/10 max-w-md">
          <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
          <ServiceForm />
        </DialogContent>
      </Dialog>

      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price/1000</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : services?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No services yet. Add one above.</TableCell></TableRow>
              ) : services?.map((s) => (
                <TableRow key={s.id} className="border-border">
                  <TableCell className="font-medium max-w-[160px] truncate">{s.name}</TableCell>
                  <TableCell className="text-sm">{s.platform}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.category}</TableCell>
                  <TableCell className="text-primary font-medium">\u20B9{Number(s.pricePerThousand).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{s.minQuantity.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{s.maxQuantity.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.isActive ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-muted-foreground"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      {s.isActive && (
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Disable
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiTab() {
  const { data: settings, isLoading } = useGetApiSettings({ query: { queryKey: getGetApiSettingsQueryKey() } });
  const { mutateAsync: save } = useUpdateApiSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setApiUrl(settings.apiUrl);
      setApiKey(settings.apiKey);
      setIsEnabled(settings.isEnabled);
    }
  }, [settings]);

  async function handleSave() {
    try {
      await save({ data: { apiUrl, apiKey, isEnabled } });
      await qc.invalidateQueries({ queryKey: getGetApiSettingsQueryKey() });
      toast({ title: "API settings saved" });
    } catch {
      toast({ title: "Failed to save API settings", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold">External SMM API</h2>
        <p className="text-muted-foreground text-sm mt-1">Connect to any SMM panel API to source services. Supports standard SMM panel API format.</p>
      </div>

      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="w-4 h-4 text-primary" />
            API Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
            <div>
              <p className="text-sm font-medium">Enable API Integration</p>
              <p className="text-xs text-muted-foreground">Orders will be forwarded to the connected API</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} disabled={isLoading} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Link className="w-3 h-3" /> API URL
            </label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://yourpanel.com/api/v2"
              className="bg-background/50"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Must support standard SMM panel API v2 format</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Key className="w-3 h-3" /> API Key
            </label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your API key from the panel"
                className="bg-background/50 pr-16"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-muted-foreground"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          {apiUrl && (
            <div className="p-3 rounded-lg bg-background/40 border border-white/5 text-xs space-y-1">
              <p className="font-medium text-muted-foreground">API Endpoint Preview</p>
              <p className="font-mono text-primary break-all">{apiUrl}?action=services&key=***</p>
            </div>
          )}

          <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-accent text-white w-full" disabled={isLoading}>
            Save API Settings
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Enter your SMM panel API URL and key above</p>
          <p>2. Enable the integration toggle</p>
          <p>3. When customers place orders on your panel, they will be forwarded to this API automatically</p>
          <p>4. Supported panels: SMMKing, JustAnotherPanel, and any panel with standard v2 API</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = useGetPaymentSettings({ query: { queryKey: getGetPaymentSettingsQueryKey() } });
  const { mutateAsync: saveSettings } = useUpdatePaymentSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [upiId, setUpiId] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  React.useEffect(() => {
    if (settings) {
      setUpiId(settings.upiId);
      setQrUrl(settings.qrUrl);
    }
  }, [settings]);

  async function handleSave() {
    try {
      await saveSettings({ data: { upiId, qrUrl } });
      await qc.invalidateQueries({ queryKey: getGetPaymentSettingsQueryKey() });
      toast({ title: "Payment settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-2xl font-bold">Payment Settings</h2>
      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardHeader><CardTitle className="text-base">UPI &amp; QR Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">UPI ID</label>
            <Input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourupi@bank"
              className="bg-background/50"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">QR Code URL</label>
            <Input
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background/50"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Paste a direct image URL for the QR code that users will scan</p>
          </div>
          {qrUrl && (
            <div className="p-3 rounded-lg bg-background/40 inline-block">
              <img src={qrUrl} alt="QR Code" className="w-32 h-32 object-contain rounded" />
            </div>
          )}
          <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-accent text-white">
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnTo = window.location.origin + window.location.pathname;
      window.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  const isAdmin = user?.id === ADMIN_USER_ID || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="bg-card/50 border-white/5 p-8 text-center space-y-3 max-w-sm">
          <Shield className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="text-muted-foreground text-sm">This admin panel is restricted. You are logged in as <span className="text-white font-mono text-xs">{user?.email}</span>.</p>
        </Card>
      </div>
    );
  }

  const sidebarItems: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "dashboard", label: "Dashboard", icon: Shield },
    { key: "users", label: "Users", icon: Users },
    { key: "orders", label: "Orders", icon: ShoppingCart },
    { key: "topups", label: "Top-ups", icon: Wallet },
    { key: "services", label: "Services", icon: ToggleLeft },
    { key: "api", label: "API Connect", icon: Link },
    { key: "settings", label: "Payment Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]">K</div>
          <div>
            <div className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">kingsmmpanel</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors text-left ${
                tab === item.key
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border text-xs text-muted-foreground truncate">{user.email}</div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "users" && <UsersTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "topups" && <TopupsTab />}
          {tab === "services" && <ServicesTab />}
          {tab === "api" && <ApiTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
