import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Appointment } from "@shared/schema";
import { FORMAT_LABELS, CATEGORY_LABELS } from "@shared/types";
import {
  CheckCircle2, Clock, DollarSign, Users, MessageCircle, X, Calendar,
  List, LogOut, Star, TrendingUp, AlertCircle, ArrowRight, Sparkles
} from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending_verification: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-600",
};
const FORMAT_COLORS: Record<string, string> = {
  video: "bg-blue-100 text-blue-700",
  audio: "bg-purple-100 text-purple-700",
  chat: "bg-green-100 text-green-700",
  async: "bg-amber-100 text-amber-700",
  in_person: "bg-rose-100 text-rose-700",
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentCard({ apt, onVerify, onDecline, onCancel, isLoading }: {
  apt: Appointment; onVerify: () => void; onDecline: () => void; onCancel: () => void; isLoading: boolean;
}) {
  const waLink = apt.whatsappNumber
    ? `https://wa.me/${apt.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi${apt.clientName ? ` ${apt.clientName}` : ""}! Regarding your ${apt.readingName} booking…`)}`
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FORMAT_COLORS[apt.format] || ""}`}>{FORMAT_LABELS[apt.format] || apt.format}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[apt.status] || ""}`}>{apt.status.replace(/_/g, " ")}</span>
            </div>
            <h3 className="font-semibold truncate">{apt.readingName}</h3>
            <p className="text-sm text-muted-foreground">
              {apt.datetime ? format(new Date(apt.datetime), "dd MMM yyyy 'at' HH:mm") : "Async delivery"}
              {apt.duration ? ` · ${apt.duration} min` : ""}
              {apt.questionCount ? ` · ${apt.questionCount === 99 ? "Unlimited" : apt.questionCount} question${apt.questionCount === 1 ? "" : "s"}` : ""}
            </p>
            {apt.clientName && <p className="text-sm">Client: <strong>{apt.clientName}</strong></p>}
            <p className="text-sm text-muted-foreground">WhatsApp: {apt.whatsappNumber}</p>
            <p className="text-sm">Payment: <strong>${apt.paymentAmount}</strong> via {apt.paymentMethod?.replace("_", " ")}</p>
            {apt.intakeAnswers?.mainQuestion && (
              <p className="text-sm text-muted-foreground italic">"{apt.intakeAnswers.mainQuestion}"</p>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-[120px]">
            {apt.status === "pending_verification" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={onVerify} disabled={isLoading}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify & Send Link
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={onDecline} disabled={isLoading}>
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
              </>
            )}
            {apt.status === "confirmed" && (
              <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 text-xs" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="text-green-700 text-xs w-full">
                  <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                </Button>
              </a>
            )}
            {apt.sessionLink && (
              <a href={apt.sessionLink.startsWith("http") ? apt.sessionLink : "#"} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="text-xs w-full truncate">
                  <ArrowRight className="h-3.5 w-3.5 mr-1" /> Session Link
                </Button>
              </a>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-3">Booked {format(new Date(apt.createdAt), "dd MMM yyyy 'at' HH:mm")}</p>
      </CardContent>
    </Card>
  );
}

function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const [month] = useState(new Date());
  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const today = new Date();
  const [selected, setSelected] = useState<number | null>(null);

  const aptsByDay: Record<number, Appointment[]> = {};
  appointments.forEach(a => {
    if (!a.datetime) return;
    const d = new Date(a.datetime);
    if (d.getMonth() === mon && d.getFullYear() === year) {
      const day = d.getDate();
      if (!aptsByDay[day]) aptsByDay[day] = [];
      aptsByDay[day].push(a);
    }
  });

  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div>
      <div className="bg-white rounded-xl border p-4 mb-4">
        <h3 className="font-semibold mb-3">{format(month, "MMMM yyyy")}</h3>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const isToday = day === today.getDate() && mon === today.getMonth() && year === today.getFullYear();
            const apts = aptsByDay[day] || [];
            return (
              <button key={day} onClick={() => setSelected(selected === day ? null : day)}
                className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-start p-1 transition-colors ${isToday ? "bg-primary text-white font-bold" : selected === day ? "bg-primary/10" : "hover:bg-muted"}`}>
                <span className={isToday ? "text-white" : ""}>{day}</span>
                {apts.length > 0 && <span className={`text-[9px] mt-0.5 font-bold ${isToday ? "text-white/80" : "text-primary"}`}>{apts.length}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Today</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Has bookings</span>
        </div>
      </div>
      {selected && aptsByDay[selected] && (
        <div className="space-y-2">
          <p className="font-medium text-sm">{format(new Date(year, mon, selected), "EEEE d MMMM")} — {aptsByDay[selected].length} booking{aptsByDay[selected].length > 1 ? "s" : ""}</p>
          {aptsByDay[selected].map(a => (
            <div key={a.id} className="bg-white rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{a.readingName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${FORMAT_COLORS[a.format]}`}>{FORMAT_LABELS[a.format]}</span>
              </div>
              {a.datetime && <p className="text-muted-foreground text-xs mt-1">{format(new Date(a.datetime), "HH:mm")} · {a.clientName || "Anonymous"}</p>}
            </div>
          ))}
        </div>
      )}
      {selected && !aptsByDay[selected] && (
        <p className="text-center text-muted-foreground text-sm py-4">No bookings on this day.</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: isLoggedIn,
    refetchInterval: 30000,
  });

  const mutate = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      const res = await apiRequest("POST", `/api/appointments/${id}/${action}`, {});
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Action failed");
      return json;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/appointments"] });
      if (vars.action === "verify" && data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
        toast({ title: "Booking verified!", description: "WhatsApp opened with the confirmation message." });
      } else {
        toast({ title: "Done", description: "Appointment updated." });
      }
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    await new Promise(r => setTimeout(r, 600));
    setIsLoggedIn(true);
    setIsLoggingIn(false);
  };

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#1a0a3e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Healer Dashboard</h1>
          <p className="text-purple-300 text-sm mt-1">Elliestrator Botanica</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block">Email</Label>
                <Input id="email" type="email" placeholder="ellie@elliestratorbotanica.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password" className="mb-1.5 block">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? "Logging in…" : "Sign In"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">Demo: any email + password</p>
          </CardContent>
        </Card>
        <div className="text-center mt-4">
          <Link href="/"><span className="text-purple-300 hover:text-white text-sm cursor-pointer">← Back to storefront</span></Link>
        </div>
      </div>
    </div>
  );

  const pending = appointments.filter(a => a.status === "pending_verification");
  const confirmed = appointments.filter(a => a.status === "confirmed");
  const completed = appointments.filter(a => a.status === "completed");
  const revenue = appointments.filter(a => ["confirmed", "completed"].includes(a.status)).reduce((s, a) => s + a.paymentAmount, 0);

  const filtered = filter === "all" ? appointments
    : filter === "pending" ? pending
    : filter === "confirmed" ? confirmed
    : filter === "completed" ? completed
    : appointments.filter(a => a.status === "cancelled" || a.status === "declined");

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-[#1a0a3e] text-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold">✦ Ellie's Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/"><Button size="sm" variant="ghost" className="text-purple-300 hover:text-white text-xs">View Storefront</Button></Link>
            <Button size="sm" variant="ghost" className="text-purple-300 hover:text-white gap-1.5" onClick={() => setIsLoggedIn(false)}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Bookings" value={appointments.length} />
          <StatCard icon={Clock} label="Awaiting Verification" value={pending.length} color="text-amber-600" />
          <StatCard icon={CheckCircle2} label="Confirmed" value={confirmed.length} color="text-green-600" />
          <StatCard icon={DollarSign} label="Revenue" value={`$${revenue}`} sub="verified bookings" color="text-blue-600" />
        </div>

        {/* WAITING NOW */}
        {pending.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                Waiting Now — {pending.length} pending verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pending.map(a => (
                <div key={a.id} className="bg-white rounded-lg border border-amber-200 p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{a.readingName}</p>
                    <p className="text-xs text-muted-foreground">{a.clientName || "Anonymous"} · {FORMAT_LABELS[a.format]} · ${a.paymentAmount} via {a.paymentMethod?.replace("_"," ")}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Submitted {format(new Date(a.createdAt), "dd MMM 'at' HH:mm")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => mutate.mutate({ id: a.id, action: "verify" })} disabled={mutate.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify & Send Link
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs" onClick={() => mutate.mutate({ id: a.id, action: "decline" })} disabled={mutate.isPending}>
                      <X className="h-3.5 w-3.5 mr-1" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* APPOINTMENTS */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Appointments</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")} className="h-8 gap-1.5"><List className="h-4 w-4" /> List</Button>
                <Button size="sm" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")} className="h-8 gap-1.5"><Calendar className="h-4 w-4" /> Calendar</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {view === "list" ? (
              <>
                <Tabs value={filter} onValueChange={setFilter} className="mb-4">
                  <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="all">All ({appointments.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed ({confirmed.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
                  </TabsList>
                </Tabs>
                {isLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No {filter === "all" ? "" : filter} appointments yet.</p>
                    {filter === "all" && <Link href="/"><Button variant="link" className="mt-2">Go to storefront →</Button></Link>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(a => (
                      <AppointmentCard key={a.id} apt={a}
                        onVerify={() => mutate.mutate({ id: a.id, action: "verify" })}
                        onDecline={() => mutate.mutate({ id: a.id, action: "decline" })}
                        onCancel={() => mutate.mutate({ id: a.id, action: "cancel" })}
                        isLoading={mutate.isPending}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <CalendarView appointments={appointments} />
            )}
          </CardContent>
        </Card>

        {/* STATS BREAKDOWN */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Bookings by Format</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(FORMAT_LABELS).map(([key, label]) => {
                const count = appointments.filter(a => a.format === key).length;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${FORMAT_COLORS[key] || ""}`}>{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Payments by Method</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {["ecocash", "world_remit", "remitly"].map(method => {
                const apts = appointments.filter(a => a.paymentMethod === method);
                const total = apts.reduce((s, a) => s + a.paymentAmount, 0);
                return (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{method.replace("_", " ")}</span>
                    <span className="font-medium">{apts.length} · ${total}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
