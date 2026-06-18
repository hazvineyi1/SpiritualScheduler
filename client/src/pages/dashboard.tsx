import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Appointment } from "@shared/schema";
import { FORMAT_LABELS } from "@shared/types";
import { CheckCircle2, Clock, DollarSign, Users, MessageCircle, X, Calendar, List, LogOut, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const BG     = "#fafaf7";
const HERO   = "#eef3ea";
const BORDER = "#ddd8ce";
const GN     = "#4a7040";
const DARK   = "#263320";
const GOLD   = "#8a6a2a";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending_verification: { bg: "#fff8e6", color: "#8a6010" },
  confirmed:            { bg: "#eef3ea", color: "#2d6020" },
  declined:             { bg: "#fef2f2", color: "#a03030" },
  completed:            { bg: "#eff6ff", color: "#2050a0" },
  cancelled:            { bg: "#f5f5f5", color: "#707060" },
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
  const sb = STATUS_BADGE[apt.status] || { bg: "#f5f5f5", color: "#707060" };
  const waLink = apt.whatsappNumber
    ? `https://wa.me/${apt.whatsappNumber.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi${apt.clientName ? ` ${apt.clientName}` : ""}! Regarding your ${apt.readingName} booking…`)}`
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f5f1eb] border-t" style={{ borderColor: "#f0ece4" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium" style={{ color: DARK }}>{apt.readingName}</span>
          <span className={`text-[10px] px-1.5 rounded font-medium ${FORMAT_PILL[apt.format] || ""}`}>{FORMAT_LABELS[apt.format] || apt.format}</span>
          <span className="text-[10px] px-1.5 rounded font-medium" style={{ background: sb.bg, color: sb.color }}>{apt.status.replace(/_/g," ")}</span>
        </div>
        <div className="text-xs space-x-2" style={{ color: "#9a8e7e" }}>
          <span>{apt.clientName || "Anonymous"}</span>
          <span>·</span>
          <span>{apt.datetime ? format(new Date(apt.datetime), "dd MMM, HH:mm") : "Async"}</span>
          <span>·</span>
          <span>${apt.paymentAmount} · {apt.paymentMethod?.replace("_"," ")}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {apt.status === "pending_verification" && <>
          <Button size="sm" className="h-7 text-xs px-2.5 text-white" style={{ background: "#4a7040" }} onClick={onVerify} disabled={isLoading}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 text-red-600 border-red-200 hover:bg-red-50" onClick={onDecline} disabled={isLoading}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>}
        {apt.status === "confirmed" && (
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" style={{ color: "#9a8e7e" }} onClick={onCancel} disabled={isLoading}>Cancel</Button>
        )}
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" style={{ color: "#2d7a6a" }}><MessageCircle className="h-3.5 w-3.5" /></Button>
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
      <p className="text-sm font-medium mb-3" style={{ color: DARK }}>{format(new Date(year, mon), "MMMM yyyy")}</p>
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border" style={{ borderColor: BORDER, background: BORDER }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[11px] font-medium py-1.5" style={{ background: "#f5f1eb", color: "#9a8e7e" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ background: "white", minHeight: 40 }} />;
          const isToday = day === now.getDate();
          const apts = byDay[day] || [];
          return (
            <button key={day} onClick={() => setSelected(selected === day ? null : day)}
              className="text-xs flex flex-col items-center justify-center transition-colors relative"
              style={{ minHeight: 40, background: selected === day ? HERO : "white", fontWeight: isToday ? 700 : 400, color: isToday ? GN : DARK }}>
              {day}
              {apts.length > 0 && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: "#9a8e7e" }}>{format(new Date(year, mon, selected), "EEEE d MMMM")}</p>
          {(byDay[selected] || []).length === 0 ? <p className="text-xs" style={{ color: "#b0a898" }}>No bookings.</p>
          : byDay[selected].map(a => (
            <div key={a.id} className="flex items-center gap-2 text-sm bg-white rounded border px-3 py-2 mb-1.5" style={{ borderColor: BORDER }}>
              <span className={`text-[10px] px-1.5 rounded ${FORMAT_PILL[a.format] || ""}`}>{FORMAT_LABELS[a.format]}</span>
              <span className="font-medium" style={{ color: DARK }}>{a.readingName}</span>
              <span className="ml-auto text-xs" style={{ color: "#9a8e7e" }}>{a.datetime ? format(new Date(a.datetime), "HH:mm") : "Async"}</span>
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <p className="text-sm font-medium mb-0.5" style={{ color: GN }}>✦ Elliestrator Botanica</p>
          <h1 className="text-xl font-semibold" style={{ color: DARK }}>Healer Dashboard</h1>
        </div>
        <div className="bg-white rounded-xl p-6 border" style={{ borderColor: BORDER }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Email</Label>
              <Input type="email" placeholder="ellie@…" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={isLoggingIn}>
              {isLoggingIn ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-xs mt-3" style={{ color: "#b0a898" }}>Demo: any email + password</p>
        </div>
        <p className="text-center mt-4">
          <Link href="/"><span className="text-xs cursor-pointer" style={{ color: "#9a8e7e" }}>← Back to storefront</span></Link>
        </p>
      </div>
    </div>
  );

  const pending   = appointments.filter(a => a.status === "pending_verification");
  const confirmed = appointments.filter(a => a.status === "confirmed");
  const completed = appointments.filter(a => a.status === "completed");
  const revenue   = appointments.filter(a => ["confirmed","completed"].includes(a.status)).reduce((s, a) => s + a.paymentAmount, 0);

  const filtered = filter === "all" ? appointments
    : filter === "pending"   ? pending
    : filter === "confirmed" ? confirmed
    : filter === "completed" ? completed
    : appointments.filter(a => ["cancelled","declined"].includes(a.status));

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white" style={{ borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: GN }}>✦ Ellie's Dashboard</span>
          <div className="flex items-center gap-1">
            <Link href="/"><Button size="sm" variant="ghost" className="h-7 text-xs" style={{ color: "#9a8e7e" }}>Storefront</Button></Link>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" style={{ color: "#9a8e7e" }} onClick={() => setIsLoggedIn(false)}>
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Total", value: appointments.length },
            { icon: Clock, label: "Awaiting", value: pending.length, color: "#8a6010" },
            { icon: CheckCircle2, label: "Confirmed", value: confirmed.length, color: GN },
            { icon: DollarSign, label: "Revenue", value: `$${revenue}`, color: GN },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: BORDER }}>
              <Icon className="h-5 w-5 flex-shrink-0" style={{ color: color || "#9a8e7e" }} />
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: DARK }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9a8e7e" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Waiting Now */}
        {pending.length > 0 && (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${GOLD}55` }}>
            <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ background: "#fffbf0", borderColor: `${GOLD}33` }}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#c9a96e" }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#c9a96e" }} />
              </span>
              <span className="text-sm font-medium" style={{ color: GOLD }}>Waiting for verification — {pending.length}</span>
            </div>
            {pending.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white" style={{ borderTop: i > 0 ? "1px solid #f5f0e8" : undefined }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: DARK }}>{a.readingName}</p>
                  <p className="text-xs" style={{ color: "#9a8e7e" }}>{a.clientName || "Anonymous"} · ${a.paymentAmount} · {a.paymentMethod?.replace("_"," ")}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs text-white" style={{ background: GN }} onClick={() => mutate.mutate({ id: a.id, action: "verify" })} disabled={mutate.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
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
        <div className="bg-white rounded-lg border" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "#f0ece4" }}>
            <div className="flex gap-0.5">
              {[["all",`All (${appointments.length})`],["pending",`Pending (${pending.length})`],["confirmed",`Confirmed (${confirmed.length})`],["completed",`Done (${completed.length})`]].map(([v,l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className="px-2.5 py-1 rounded text-xs transition-colors"
                  style={{ background: filter === v ? HERO : "transparent", color: filter === v ? GN : "#9a8e7e", fontWeight: filter === v ? 600 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5">
              <button onClick={() => setView("list")} className="p-1.5 rounded transition-colors" style={{ background: view === "list" ? HERO : "transparent", color: view === "list" ? GN : "#9a8e7e" }}><List className="h-4 w-4" /></button>
              <button onClick={() => setView("calendar")} className="p-1.5 rounded transition-colors" style={{ background: view === "calendar" ? HERO : "transparent", color: view === "calendar" ? GN : "#9a8e7e" }}><Calendar className="h-4 w-4" /></button>
            </div>
          </div>

          {view === "calendar" ? (
            <div className="p-4"><CalendarView appointments={appointments} /></div>
          ) : isLoading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="h-7 w-7 mx-auto mb-2" style={{ color: "#ddd8ce" }} />
              <p className="text-sm" style={{ color: "#9a8e7e" }}>No {filter === "all" ? "" : filter} appointments yet.</p>
              {filter === "all" && <Link href="/"><Button variant="link" className="mt-1 text-xs" style={{ color: GN }}>Go to storefront →</Button></Link>}
            </div>
          ) : (
            <div>{filtered.map(a => (
              <AppointmentRow key={a.id} apt={a}
                onVerify={() => mutate.mutate({ id: a.id, action: "verify" })}
                onDecline={() => mutate.mutate({ id: a.id, action: "decline" })}
                onCancel={() => mutate.mutate({ id: a.id, action: "cancel" })}
                isLoading={mutate.isPending} />
            ))}</div>
          )}
        </div>

        {/* Breakdown */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: "By Format", entries: Object.entries(FORMAT_LABELS).map(([k, v]) => ({ label: v, count: appointments.filter(a => a.format === k).length })) },
            { title: "By Payment", entries: ["ecocash","innbucks","world_remit","remitly"].map(m => ({ label: m.replace("_"," "), count: appointments.filter(a => a.paymentMethod === m).length, total: appointments.filter(a => a.paymentMethod === m).reduce((s, a) => s + a.paymentAmount, 0) })) },
          ].map(({ title, entries }) => (
            <div key={title} className="bg-white rounded-lg border p-4" style={{ borderColor: BORDER }}>
              <p className="text-xs font-medium mb-3" style={{ color: "#9a8e7e" }}>{title}</p>
              <div className="space-y-2">
                {entries.map((e: any) => (
                  <div key={e.label} className="flex items-center justify-between text-sm">
                    <span className="capitalize" style={{ color: "#5a5040" }}>{e.label}</span>
                    <span className="font-medium" style={{ color: GN }}>{e.count}{e.total !== undefined ? ` · $${e.total}` : ""}</span>
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
