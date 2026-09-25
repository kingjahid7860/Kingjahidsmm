import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { FirebaseAuthProvider } from "@/hooks/use-firebase-auth";
import Login from "./pages/login";
import PublicHome from "./pages/public-home";
import Dashboard from "./pages/dashboard";
import Services from "./pages/services";
import NewOrder from "./pages/new-order";
import Orders from "./pages/orders";
import Wallet from "./pages/wallet";
import Profile from "./pages/profile";
import Layout from "./components/layout";
import PublicLayout from "./components/public-layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/login"><Login initialMode="login" /></Route>
      <Route path="/register"><Login initialMode="signup" /></Route>
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/services">
        <PublicHomeServices />
      </Route>
      <Route path="/new-order">
        <PublicOrder />
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

function PublicHomeServices() {
  return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-10 md:px-8"><Services /></div></PublicLayout>;
}

function PublicOrder() {
  return <PublicLayout><div className="px-4 py-10 md:px-8"><NewOrder /></div></PublicLayout>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </FirebaseAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
