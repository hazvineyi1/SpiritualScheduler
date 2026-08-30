import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AdminLeads from "@/pages/admin-leads";
import ForHealers from "@/pages/for-healers";
import Home from "@/pages/home";
import Book from "@/pages/book";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Locked down: no map, no country directories, no public feedback form,
// no public signup — nothing that lets someone browse or discover a hub
// without already having its direct link. The marketing page is
// re-enabled for review; everything else, including "/", falls through
// to NotFound.
function Router() {
  return (
    <Switch>
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/for-healers" component={ForHealers} />
      <Route path="/:slug/dashboard" component={Dashboard} />
      <Route path="/:slug/book/:readingId" component={Book} />
      <Route path="/:slug" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
