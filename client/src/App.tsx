import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Booking from "@/pages/booking";
import SharedBooking from "@/pages/shared-booking";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Booking} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/shared/:id" component={SharedBooking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;