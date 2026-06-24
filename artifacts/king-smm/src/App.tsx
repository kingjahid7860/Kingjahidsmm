import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Services from "./pages/services";
import NewOrder from "./pages/new-order";
import Orders from "./pages/orders";
import Wallet from "./pages/wallet";
import Profile from "./pages/profile";
import Layout from "./components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/services">
        <Layout><Services /></Layout>
      </Route>
      <Route path="/new-order">
        <Layout><NewOrder /></Layout>
      </Route>
      <Route path="/orders">
        <Layout><Orders /></Layout>
      </Route>
      <Route path="/wallet">
        <Layout><Wallet /></Layout>
      </Route>
      <Route path="/profile">
        <Layout><Profile /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
