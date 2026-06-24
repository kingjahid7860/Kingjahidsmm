import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useListServices, useCreateOrder, getListServicesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  serviceId: z.coerce.number().min(1, "Please select a service"),
  link: z.string().url("Please enter a valid URL"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

export default function NewOrder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialServiceId = searchParams.get("service");

  const { data: services, isLoading: servicesLoading } = useListServices(undefined, { 
    query: { queryKey: getListServicesQueryKey() } 
  });
  const createOrder = useCreateOrder();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: initialServiceId ? Number(initialServiceId) : 0,
      link: "",
      quantity: 1000,
    },
  });

  const selectedServiceId = form.watch("serviceId");
  const quantity = form.watch("quantity");
  
  const selectedService = services?.find(s => s.id === selectedServiceId);
  
  const charge = selectedService && quantity ? (selectedService.pricePerThousand / 1000) * quantity : 0;

  useEffect(() => {
    if (selectedService) {
      if (quantity < selectedService.minQuantity) form.setValue("quantity", selectedService.minQuantity);
      if (quantity > selectedService.maxQuantity) form.setValue("quantity", selectedService.maxQuantity);
    }
  }, [selectedServiceId, selectedService, form, quantity]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    createOrder.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Order placed successfully!", variant: "default" });
        setLocation("/orders");
      },
      onError: (err: any) => {
        toast({ title: "Failed to place order", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Order</h1>
        <p className="text-muted-foreground mt-1">Place a new order for social media growth.</p>
      </div>

      <Card className="bg-card/80 border-white/10 shadow-2xl backdrop-blur">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>Fill in the details below to start your campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select disabled={servicesLoading} onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10 h-12">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {services?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.id} - {s.name} (₹{s.pricePerThousand}/1k)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedService && (
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 text-sm space-y-2">
                  <p><strong>Description:</strong> {selectedService.description || "No description provided."}</p>
                  <div className="flex gap-4 text-muted-foreground">
                    <p>Min: {selectedService.minQuantity}</p>
                    <p>Max: {selectedService.maxQuantity}</p>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." className="bg-background/50 border-white/10 h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" className="bg-background/50 border-white/10 h-12 font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Charge</p>
                  <p className="text-3xl font-bold text-primary tracking-tight">
                    ₹{charge.toFixed(2)}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={createOrder.isPending || !selectedService}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 border-0 shadow-[0_0_15px_rgba(236,72,153,0.3)] h-12 px-8 text-base"
                >
                  {createOrder.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Submit Order
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
