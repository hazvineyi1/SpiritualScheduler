import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AfricaMap from "@/pages/africa-map";
import CountryHub from "@/pages/country";
import ForHealers from "@/pages/for-healers";
import AdminLeads from "@/pages/admin-leads";
import Feedback from "@/pages/feedback";
import Signup from "@/pages/signup";
import Home from "@/pages/home";
import Book from "@/pages/book";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AfricaMap} />
      <Route path="/for-healers" component={ForHealers} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/signup" component={Signup} />
      <Route path="/country/:slug" component={CountryHub} />
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
