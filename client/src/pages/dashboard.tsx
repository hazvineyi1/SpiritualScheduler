import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Appointment } from "@shared/schema";
import { FORMAT_LABELS, CATEGORY_LABELS } from "@shared/types";
import { CheckCircle2, Clock, DollarSign, Users, MessageCircle, X, Calendar, List, LogOut, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const GN = "#4a6741";
const STATUS_STYLES: Record<string, string> = {
  pending_verification: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-sky-50 text-sky-700 border-sky-200",
  cancelled: "bg-stone-50 text-stone-500 border-stone-200",
};
const FORMAT_PILL: Record<string, string> = {
  video: "bg-sky-50 text-sky-700",
  audio: "bg-violet-50 text-violet-700",
  chat: "bg-teal-50 text-teal-700",
  async: "bg-stone-100 text-stone-600",
  in_person: "bg-rose-50 text-rose-700",
};

function AppointmentRow({ apt, onVerify, onDecline, onCancel, isLoading }: {
  apt: Appointment; onVerify: () => void; onDecline: () => void; onCancel: () => void; isLoading: boolean;
}) {
  const waLink = apt.whatsappNumber
    ? `https://wa.me/${apt.whatsappNumber.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi${apt.clientName ? ` ${apt.clientName}` : ""}! Re your ${apt.readingName} booking…`)}`
    : null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf6f0] transition-colors border-t" style={{ borderColor: "#f0ebe3" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium" style={{ color: "#2c2418" }}>{apt.readingName}</span>
          <span className={`text-[10px] px-1.5 rounded border font-medium ${FORMAT_PILL[apt.format] || ""}`}>{FORMAT_LABELS[apt.format] || apt.format}</span>
          <span className={`text-[10px] px-1.5 rounded border font-medium ${STATUS_STYLES[apt.status] || ""}`}>{apt.status.replace(/_/g," ")}</span>
        </div>
        <div className="text-xs text-stone-400 space-x-3">
          <span>{apt.clientName || "Anonymous"}</span>
          <span>{apt.datetime ? format(new Date(apt.datetime), "dd MMM, HH:mm") : "Async"}</span>
          <span>${apt.paymentAmount} · {apt.paymentMethod?.replace("_"," ")}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {apt.status === "pending_verification" && <>
          <Button size="sm" className="h-7 text-xs px-2.5 bg-green-700 hover:bg-green-800 text-white" onClick={onVerify} disabled={isLoading}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 text-red-600 border-red-200 hover:bg-red-50" onClick={onDecline} disabled={isLoading}>
            <X className="h-3.5 w-3.5 mr-1" />Decline
          </Button>
        </>}
        {apt.status === "confirmed" && (
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 text-stone-500" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        )}
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-teal-700"><MessageCircle className="h-3.5 w-3.5" /></Button>
          </a>
        )}
      </div>
    </div>
  );
}

function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const now = new Date();
  const year = now.getFullYear(), mon = now.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const byDay: Record<number, Appointment[]> = {};
  appointments.forEach(a => {
    if (!a.datetime) return;
    const d = new Date(a.datetime);
    if (d.getMonth() === mon && d.getFullYear() === year) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(a);
    }
  });

  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  return (
    <div>
      <p className="text-sm font-medium mb-3" style={{ color: "#2c2418" }}>{format(new Date(year, mon), "MMMM yyyy")}</p>
      <div className="grid grid-cols-7 gap-px bg-stone-100 rounded-lg overflow-hidden border" style={{ borderColor: "#e5ddd0" }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="bg-stone-50 text-center text-[11px] font-medium text-stone-400 py-1.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="bg-white h-10" />;
          const isToday = day === now.getDate();
          const apts = byDay[day] || [];
          return (
            <button key={day} onClick={() => setSelected(selected === day ? null : day)}
              className="bg-white h-10 text-xs flex flex-col items-center justify-center hover:bg-[#faf6f0] transition-colors relative"
              style={{ fontWeight: isToday ? 700 : 400, color: isToday ? GN : "#2c2418" }}>
              {day}
              {apts.length > 0 && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: "#c9a96e" }} />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3">
          <p className="text-xs text-stone-500 mb-2">{format(new Date(year, mon, selected), "EEEE d MMMM")}</p>
          {(byDay[selected] || []).length === 0 ? (
            <p className="text-xs text-stone-400">No bookings.</p>
          ) : byDay[selected].map(a => (
            <div key={a.id} className="flex items-center gap-2 text-sm bg-white rounded border px-3 py-2 mb-1.5" style={{ borderColor: "#e5ddd0" }}>
              <span className={`text-[10px] px-1.5 rounded ${FORMAT_PILL[a.format] || ""}`}>{FORMAT_LABELS[a.format]}</span>
              <span className="font-medium" style={{ color: "#2c2418" }}>{a.readingName}</span>
              <span className="text-stone-400 text-xs ml-auto">{a.datetime ? format(new Date(a.datetime), "HH:mm") : "Async"}</span>
            </div>
          ))}
        </div>
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
        toast({ title: "Booking verified", description: "WhatsApp opened with confirmation." });
      } else toast({ title: "Updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    await new Promise(r => setTimeout(r, 500));
    setIsLoggedIn(true);
    setIsLoggingIn(false);
  };

  if (!isLoggedIn) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#1e2318" }}>
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <p className="text-sm font-medium mb-0.5" style={{ color: "#c9a96e" }}>✦ Elliestrator Botanica</p>
          <h1 className="text-xl font-semibold text-white">Healer Dashboard</h1>
        </div>
        <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #2d3323" }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs text-stone-500 mb-1.5 block">Email</Label>
              <Input type="email" placeholder="ellie@…" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs text-stone-500 mb-1.5 block">Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={isLoggingIn}>
              {isLoggingIn ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-3">Demo: any email + password</p>
        </div>
        <p className="text-center mt-4"><Link href="/"><span className="text-xs cursor-pointer" style={{ color: "#9aaa8a" }}>← Back to storefront</span></Link></p>
      </div>
    </div>
  );

  const pending = appointments.filter(a => a.status === "pending_verification");
  const confirmed = appointments.filter(a => a.status === "confirmed");
  const completed = appointments.filter(a => a.status === "completed");
  const revenue = appointments.filter(a => ["confirmed","completed"].includes(a.status)).reduce((s, a) => s + a.paymentAmount, 0);

  const filtered = filter === "all" ? appointments
    : filter === "pending" ? pending
    : filter === "confirmed" ? confirmed
    : filter === "completed" ? completed
    : appointments.filter(a => ["cancelled","declined"].includes(a.status));

  return (
    <div className="min-h-screen" style={{ background: "#faf6f0" }}>
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10" style={{ borderColor: "#e5ddd0" }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: "#4a6741" }}>✦ Ellie's Dashboard</span>
          <div className="flex items-center gap-2">
            <Link href="/"><Button size="sm" variant="ghost" className="h-7 text-xs text-stone-500">Storefront</Button></Link>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-stone-500 gap-1" onClick={() => setIsLoggedIn(false)}>
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Total", value: appointments.length },
            { icon: Clock, label: "Awaiting", value: pending.length, color: "#b5730a" },
            { icon: CheckCircle2, label: "Confirmed", value: confirmed.length, color: "#4a7a3d" },
            { icon: DollarSign, label: "Revenue", value: `$${revenue}`, color: "#4a6741" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: "#e5ddd0" }}>
              <Icon className="h-5 w-5 flex-shrink-0" style={{ color: color || "#8a9080" }} />
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: "#2c2418" }}>{value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Waiting Now */}
        {pending.length > 0 && (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#c9a96e55" }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#fffbf3" }}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-sm font-medium" style={{ color: "#7a6030" }}>Waiting for verification — {pending.length} pending</span>
            </div>
            {pending.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white" style={{ borderTop: i > 0 ? "1px solid #f5f0e8" : "1px solid #f0e8d0" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#2c2418" }}>{a.readingName}</p>
                  <p className="text-xs text-stone-400">{a.clientName || "Anonymous"} · ${a.paymentAmount} via {a.paymentMethod?.replace("_"," ")}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white" onClick={() => mutate.mutate({ id: a.id, action: "verify" })} disabled={mutate.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => mutate.mutate({ id: a.id, action: "decline" })} disabled={mutate.isPending}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Appointments */}
        <div className="bg-white rounded-lg border" style={{ borderColor: "#e5ddd0" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#f0ebe3" }}>
            <div className="flex gap-1">
              {[["all", `All (${appointments.length})`], ["pending", `Pending (${pending.length})`], ["confirmed", `Confirmed (${confirmed.length})`], ["completed", `Done (${completed.length})`]].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: filter === v ? "#f2f7f0" : "transparent", color: filter === v ? GN : "#9a9080", fontWeight: filter === v ? 600 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setView("list")} className="p-1.5 rounded transition-colors" style={{ background: view === "list" ? "#f2f7f0" : "transparent", color: view === "list" ? GN : "#9a9080" }}><List className="h-4 w-4" /></button>
              <button onClick={() => setView("calendar")} className="p-1.5 rounded transition-colors" style={{ background: view === "calendar" ? "#f2f7f0" : "transparent", color: view === "calendar" ? GN : "#9a9080" }}><Calendar className="h-4 w-4" /></button>
            </div>
          </div>

          {view === "calendar" ? (
            <div className="p-4"><CalendarView appointments={appointments} /></div>
          ) : isLoading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-stone-200" />
              <p className="text-sm text-stone-400">No {filter === "all" ? "" : filter} appointments yet.</p>
              {filter === "all" && <Link href="/"><Button variant="link" className="mt-1 text-xs text-teal-700">Go to storefront →</Button></Link>}
            </div>
          ) : (
            <div>
              {filtered.map(a => (
                <AppointmentRow key={a.id} apt={a}
                  onVerify={() => mutate.mutate({ id: a.id, action: "verify" })}
                  onDecline={() => mutate.mutate({ id: a.id, action: "decline" })}
                  onCancel={() => mutate.mutate({ id: a.id, action: "cancel" })}
                  isLoading={mutate.isPending} />
              ))}
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: "By Format", entries: Object.entries(FORMAT_LABELS).map(([k, v]) => ({ k, v, count: appointments.filter(a => a.format === k).length })) },
            { title: "By Payment Method", entries: ["ecocash","world_remit","remitly"].map(m => ({ k: m, v: m.replace("_"," "), count: appointments.filter(a => a.paymentMethod === m).length, total: appointments.filter(a => a.paymentMethod === m).reduce((s, a) => s + a.paymentAmount, 0) })) },
          ].map(({ title, entries }) => (
            <div key={title} className="bg-white rounded-lg border p-4" style={{ borderColor: "#e5ddd0" }}>
              <p className="text-xs font-medium text-stone-500 mb-3">{title}</p>
              <div className="space-y-2">
                {entries.map((e: any) => (
                  <div key={e.k} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-stone-600">{e.v}</span>
                    <span className="font-medium" style={{ color: "#4a6741" }}>{e.count}{e.total !== undefined ? ` · $${e.total}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
