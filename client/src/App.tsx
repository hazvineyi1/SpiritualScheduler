import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AdminLeads from "@/pages/admin-leads";
import Home from "@/pages/home";
import Book from "@/pages/book";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Locked down: no map, no country directories, no marketing page, no
// public feedback form, no public signup — nothing that lets someone
// browse or discover a hub without already having its direct link.
// Only an individual healer's own hub (and its booking flow / login)
// resolves; everything else, including "/", falls through to NotFound.
function Router() {
  return (
    <Switch>
      <Route path="/admin/leads" component={AdminLeads} />
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
