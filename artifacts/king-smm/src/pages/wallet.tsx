import { useGetWallet, useTopupWallet, useListTopups, getGetWalletQueryKey, getListTopupsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Wallet as WalletIcon, CreditCard, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const topupSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum topup is ₹10"),
  transactionId: z.string().min(1, "Required"),
});

export default function Wallet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: wallet } = useGetWallet({ query: { queryKey: getGetWalletQueryKey() } });
  const { data: topups } = useListTopups({ query: { queryKey: getListTopupsQueryKey() } });
  const topupMutation = useTopupWallet();

  const form = useForm<z.infer<typeof topupSchema>>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: 100,
      transactionId: "",
    },
  });

  function onSubmit(values: z.infer<typeof topupSchema>) {
    topupMutation.mutate({ data: { ...values, paymentMethod: "UPI" } }, {
      onSuccess: () => {
        toast({ title: "₹" + values.amount + " added successfully", description: "Your wallet has been credited instantly." });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListTopupsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to submit request", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground mt-1">Manage your funds and add balance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-primary/20 to-accent/20 border-primary/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <WalletIcon className="w-48 h-48" />
          </div>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight text-white mb-4">
              ₹{wallet?.balance?.toFixed(2) || "0.00"}
            </div>
            <div className="text-sm text-muted-foreground flex justify-between">
              <span>Total Spent:</span>
              <span className="text-foreground">₹{wallet?.totalSpent?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="text-sm text-muted-foreground flex justify-between mt-1">
              <span>Total Added:</span>
              <span className="text-foreground">₹{wallet?.totalAdded?.toFixed(2) || "0.00"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card/50 border-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>Add Funds</CardTitle>
            <CardDescription>Scan QR code to pay via UPI, then enter transaction ID to add balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-4 w-full">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
                  <img src="/qr-code.jpg" alt="UPI QR Code" className="w-48 h-48 mx-auto object-contain rounded-lg" />
                  <p className="text-sm font-medium text-white">UPI ID: <span className="font-mono text-primary">9102487609@ybl</span></p>
                  <p className="text-xs text-muted-foreground">India Post Payment Bank</p>
                </div>
              </div>
              <div className="flex-1 w-full">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" className="bg-background/50 border-white/10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transactionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UPI Transaction ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter UPI Transaction ID" className="bg-background/50 border-white/10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={topupMutation.isPending} className="w-full bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 border-0 mt-2">
                      {topupMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      Add Funds Instantly
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>Top-up History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-border">
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!topups || topups.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No history found.</TableCell></TableRow>
              ) : (
                topups.map(t => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell className="text-sm">{format(new Date(t.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="uppercase text-xs">{t.paymentMethod}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-sm">{t.transactionId}</TableCell>
                    <TableCell className="text-right font-medium text-green-400">₹{t.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        t.status === 'completed' ? 'text-green-400 border-green-400/30' : 
                        t.status === 'rejected' ? 'text-destructive border-destructive/30' :
                        'text-accent border-accent/30'
                      }>
                        {t.status}
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
