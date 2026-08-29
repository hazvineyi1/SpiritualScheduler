import { useState, useEffect } from "react";
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
import {
  CheckCircle2, Clock, DollarSign, Users, MessageCircle, X, Calendar, List,
  LogOut, AlertCircle, Radio, PlayCircle, CheckSquare, CalendarClock, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import ScheduleManager from "@/components/dashboard/ScheduleManager";

const BG     = "#ffffff";
const HERO   = "#f7f6f2";
const BORDER = "#e2e0da";
const GN     = "#b8962e";
const DARK   = "#111111";
const GOLD   = "#8a6a2a";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending_verification: { bg: "#fff8e6", color: "#8a6010" },
  confirmed:            { bg: "#f7f6f2", color: "#8a6a2a" },
  in_progress:          { bg: "#eafaf0", color: "#1f7a3f" },
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

// ---- Session timing -------------------------------------------------------
type TimingKey = "in_progress" | "live" | "starting_soon" | "upcoming" | "ended" | "async" | "done";
interface Timing { key: TimingKey; label: string; ms: number; }

const TIMING_STYLE: Record<TimingKey, { bg: string; color: string; pulse?: boolean }> = {
  in_progress:   { bg: "#1f7a3f", color: "#ffffff", pulse: true },
  live:          { bg: "#eafaf0", color: "#1f7a3f", pulse: true },
  starting_soon: { bg: "#fffbf0", color: GOLD, pulse: true },
  upcoming:      { bg: "#f3f1ec", color: "#7a7060" },
  ended:         { bg: "#eff6ff", color: "#2050a0" },
  async:         { bg: "#f3f1ec", color: "#7a7060" },
  done:          { bg: "#eff6ff", color: "#2050a0" },
};

function rel(ms: number): string {
  const m = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

function sessionTiming(apt: Appointment, now: number): Timing {
  if (apt.status === "in_progress") return { key: "in_progress", label: "In session", ms: 0 };
  if (apt.status === "completed")   return { key: "done", label: "Completed", ms: 0 };
  if (!apt.datetime) return { key: "async", label: "Async delivery", ms: 0 };
  const start = new Date(apt.datetime).getTime();
  const end = start + (apt.duration || 30) * 60000;
  if (now < start - 15 * 60000) return { key: "upcoming", label: `In ${rel(start - now)}`, ms: start - now };
  if (now < start)              return { key: "starting_soon", label: `Starts in ${rel(start - now)}`, ms: start - now };
  if (now <= end)               return { key: "live", label: `Live · ${rel(end - now)} left`, ms: end - now };
  return { key: "ended", label: `Ended ${rel(now - end)} ago`, ms: now - end };
}

function clientWaLink(apt: Appointment, msg: string): string | null {
  if (!apt.whatsappNumber) return null;
  return `https://wa.me/${apt.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

function startMessage(apt: Appointment): string {
  const fmt = FORMAT_LABELS[apt.format] || apt.format;
  return `Hi ${apt.clientName || "there"}! ✦ This is VaShava from VaShava 🌿 We're ready to begin your ${apt.readingName} (${fmt}) session now. Please join within the next 5 minutes to acknowledge — otherwise we'll need to reschedule.`;
}

// ---- Live session card ----------------------------------------------------
function SessionCard({ apt, now, onStart, onComplete, onCancel, busy }: {
  apt: Appointment; now: number;
  onStart: (a: Appointment) => void; onComplete: (id: number) => void; onCancel: (id: number) => void; busy: boolean;
}) {
  const t = sessionTiming(apt, now);
  const st = TIMING_STYLE[t.key];
  const live = t.key === "in_progress" || t.key === "live" || t.key === "starting_soon";
  return (
    <div className="rounded-lg border bg-white p-3" style={{ borderColor: live ? `${GN}55` : BORDER }}>
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate" style={{ color: DARK }}>{apt.readingName}</span>
            <span className={`text-[10px] px-1.5 rounded font-medium ${FORMAT_PILL[apt.format] || ""}`}>{FORMAT_LABELS[apt.format] || apt.format}</span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#9a8e7e" }}>
            {apt.clientName || "Anonymous"} · {apt.whatsappNumber}
            {apt.datetime ? ` · ${format(new Date(apt.datetime), "dd MMM HH:mm")}` : ""}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0" style={{ background: st.bg, color: st.color }}>
          {st.pulse && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: st.color }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: st.color }} />
            </span>
          )}
          {t.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {apt.status === "confirmed" && (
          <Button size="sm" className="h-7 text-xs px-2.5 text-white flex-1" style={{ background: GN }} disabled={busy} onClick={() => onStart(apt)}>
            <PlayCircle className="h-3.5 w-3.5 mr-1" /> Start on WhatsApp
          </Button>
        )}
        {apt.status === "in_progress" && (
          <>
            <a href={clientWaLink(apt, startMessage(apt)) || "#"} target="_blank" rel="noreferrer" className="flex-1">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 w-full" style={{ color: GN, borderColor: `${GN}55` }}>
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Open chat
              </Button>
            </a>
            <Button size="sm" className="h-7 text-xs px-2.5 text-white flex-1" style={{ background: "#2050a0" }} disabled={busy} onClick={() => onComplete(apt.id)}>
              <CheckSquare className="h-3.5 w-3.5 mr-1" /> End session
            </Button>
          </>
        )}
        {apt.status === "confirmed" && (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" style={{ color: "#b0a898" }} disabled={busy} onClick={() => onCancel(apt.id)}>Cancel</Button>
        )}
      </div>
    </div>
  );
}

// ---- Appointment row (table) ----------------------------------------------
function AppointmentRow({ apt, now, onStart, onComplete, onVerify, onDecline, onCancel, busy }: {
  apt: Appointment; now: number;
  onStart: (a: Appointment) => void; onComplete: (id: number) => void;
  onVerify: (id: number) => void; onDecline: (id: number) => void; onCancel: (id: number) => void; busy: boolean;
}) {
  const sb = STATUS_BADGE[apt.status] || { bg: "#f5f5f5", color: "#707060" };
  const chat = clientWaLink(apt, `Hi${apt.clientName ? ` ${apt.clientName}` : ""}! Regarding your ${apt.readingName} booking…`);
  const showTiming = apt.status === "confirmed" || apt.status === "in_progress";
  const t = showTiming ? sessionTiming(apt, now) : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f5f1eb] border-t" style={{ borderColor: "#f0ece4" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium" style={{ color: DARK }}>{apt.readingName}</span>
          <span className={`text-[10px] px-1.5 rounded font-medium ${FORMAT_PILL[apt.format] || ""}`}>{FORMAT_LABELS[apt.format] || apt.format}</span>
          <span className="text-[10px] px-1.5 rounded font-medium" style={{ background: sb.bg, color: sb.color }}>{apt.status.replace(/_/g, " ")}</span>
          {t && (
            <span className="text-[10px] px-1.5 rounded font-medium" style={{ background: TIMING_STYLE[t.key].bg, color: TIMING_STYLE[t.key].color }}>{t.label}</span>
          )}
        </div>
        <div className="text-xs space-x-2" style={{ color: "#9a8e7e" }}>
          <span>{apt.clientName || "Anonymous"}</span>
          <span>·</span>
          <span>{apt.datetime ? format(new Date(apt.datetime), "dd MMM, HH:mm") : "Async"}</span>
          <span>·</span>
          <span>${apt.paymentAmount} · {apt.paymentMethod?.replace("_", " ")}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {apt.status === "pending_verification" && <>
          <Button size="sm" className="h-7 text-xs px-2.5 text-white" style={{ background: GN }} onClick={() => onVerify(apt.id)} disabled={busy}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onDecline(apt.id)} disabled={busy}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>}
        {apt.status === "confirmed" && (
          <Button size="sm" className="h-7 text-xs px-2.5 text-white" style={{ background: GN }} onClick={() => onStart(apt)} disabled={busy}>
            <PlayCircle className="h-3.5 w-3.5 mr-1" />Start
          </Button>
        )}
        {apt.status === "in_progress" && (
          <Button size="sm" className="h-7 text-xs px-2.5 text-white" style={{ background: "#2050a0" }} onClick={() => onComplete(apt.id)} disabled={busy}>
            <CheckSquare className="h-3.5 w-3.5 mr-1" />End
          </Button>
        )}
        {(apt.status === "confirmed") && (
          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" style={{ color: "#9a8e7e" }} onClick={() => onCancel(apt.id)} disabled={busy}>Cancel</Button>
        )}
        {chat && (
          <a href={chat} target="_blank" rel="noreferrer">
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: me, isLoading: authLoading } = useQuery<{ email: string; role: string; name: string } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Couldn't check sign-in status");
      return (await res.json()).data;
    },
    retry: false,
  });
  const isLoggedIn = !!me;

  const login = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || "Sign in failed");
      return json.data;
    },
    onSuccess: () => { setLoginError(""); setPassword(""); qc.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
    onError: (e: Error) => setLoginError(e.message),
  });

  const logout = useMutation({
    mutationFn: async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); },
    onSuccess: () => { qc.clear(); },
  });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: isLoggedIn,
    refetchInterval: 20000,
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
        toast({ title: "Booking verified", description: "Confirmation opened in WhatsApp." });
      } else if (vars.action === "start") {
        toast({ title: "Session started", description: "Opened WhatsApp with the client." });
      } else if (vars.action === "complete") {
        toast({ title: "Session completed" });
      } else toast({ title: "Updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const act = (id: number, action: string) => mutate.mutate({ id, action });

  const resetData = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/appointments/reset-all", {});
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Reset failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Data reset", description: "All bookings have been cleared." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleResetData = () => {
    if (window.confirm("Reset all booking data? This permanently clears every appointment shown in this dashboard and cannot be undone.")) {
      resetData.mutate();
    }
  };

  const startSession = (apt: Appointment) => {
    const link = clientWaLink(apt, startMessage(apt));
    if (link) window.open(link, "_blank");
    mutate.mutate({ id: apt.id, action: "start" });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate();
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: "#9a8e7e" }}>
      Loading…
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <p className="text-sm font-medium mb-0.5" style={{ color: GN }}>✦ VaShava</p>
          <h1 className="text-xl font-semibold" style={{ color: DARK }}>Healer Dashboard</h1>
        </div>
        <div className="bg-white rounded-xl p-6 border" style={{ borderColor: BORDER }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Email</Label>
              <Input type="email" placeholder="vashava@…" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {loginError && <p className="text-xs" style={{ color: "#b05050" }}>{loginError}</p>}
            <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-xs mt-3" style={{ color: "#b0a898" }}>Demo login: vashava@vashava.com / healer123</p>
        </div>
        <p className="text-center mt-4">
          <Link href="/"><span className="text-xs cursor-pointer" style={{ color: "#9a8e7e" }}>← Back to storefront</span></Link>
        </p>
      </div>
    </div>
  );

  const pending   = appointments.filter(a => a.status === "pending_verification");
  const confirmed = appointments.filter(a => a.status === "confirmed");
  const inProgress = appointments.filter(a => a.status === "in_progress");
  const completed = appointments.filter(a => a.status === "completed");
  const revenue   = appointments.filter(a => ["confirmed","in_progress","completed"].includes(a.status)).reduce((s, a) => s + a.paymentAmount, 0);

  // Active sessions (confirmed + in progress), sorted by soonest first.
  const active = [...confirmed, ...inProgress].sort((a, b) => {
    const ta = a.datetime ? new Date(a.datetime).getTime() : Infinity;
    const tb = b.datetime ? new Date(b.datetime).getTime() : Infinity;
    return ta - tb;
  });
  const liveNow = active.filter(a => {
    const k = sessionTiming(a, now).key;
    return k === "in_progress" || k === "live" || k === "starting_soon";
  });

  const filtered = filter === "all" ? appointments
    : filter === "pending"   ? pending
    : filter === "sessions"  ? active
    : filter === "completed" ? completed
    : appointments.filter(a => ["cancelled","declined"].includes(a.status));

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white" style={{ borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: GN }}>✦ VaShava's Dashboard</span>
          <div className="flex items-center gap-1">
            <Link href="/"><Button size="sm" variant="ghost" className="h-7 text-xs" style={{ color: "#9a8e7e" }}>Storefront</Button></Link>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" style={{ color: "#a03030" }} onClick={handleResetData} disabled={resetData.isPending}>
              <Trash2 className="h-3.5 w-3.5" /> {resetData.isPending ? "Resetting…" : "Reset Data"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" style={{ color: "#9a8e7e" }} onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Users, label: "Total", value: appointments.length },
            { icon: Clock, label: "Awaiting", value: pending.length, color: "#8a6010" },
            { icon: CalendarClock, label: "Upcoming", value: confirmed.length, color: GN },
            { icon: Radio, label: "Live now", value: liveNow.length, color: liveNow.length ? "#1f7a3f" : "#9a8e7e" },
            { icon: CheckCircle2, label: "Completed", value: completed.length, color: "#2050a0" },
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

        {/* Needs verification */}
        {pending.length > 0 && (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${GOLD}55` }}>
            <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ background: "#fffbf0", borderColor: `${GOLD}33` }}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#c9a96e" }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#c9a96e" }} />
              </span>
              <span className="text-sm font-medium" style={{ color: GOLD }}>Payments to verify — {pending.length}</span>
            </div>
            {pending.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white" style={{ borderTop: i > 0 ? "1px solid #f5f0e8" : undefined }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: DARK }}>{a.readingName}</p>
                  <p className="text-xs" style={{ color: "#9a8e7e" }}>
                    {a.clientName || "Anonymous"} · ${a.paymentAmount} · {a.paymentMethod?.replace("_"," ")}
                    {a.paymentReference ? ` · ref ${a.paymentReference}` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs text-white" style={{ background: GN }} onClick={() => act(a.id, "verify")} disabled={mutate.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => act(a.id, "decline")} disabled={mutate.isPending}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live & upcoming sessions */}
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: liveNow.length ? `${GN}55` : BORDER }}>
          <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ background: HERO, borderColor: "#e2e8da" }}>
            <Radio className="h-4 w-4" style={{ color: GN }} />
            <span className="text-sm font-medium" style={{ color: DARK }}>Sessions</span>
            {liveNow.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white flex items-center gap-1" style={{ background: "#1f7a3f" }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 bg-white" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                {liveNow.length} live
              </span>
            )}
            <span className="ml-auto text-xs" style={{ color: "#9a8e7e" }}>{active.length} active</span>
          </div>
          {active.length === 0 ? (
            <div className="py-8 text-center bg-white">
              <CalendarClock className="h-7 w-7 mx-auto mb-2" style={{ color: "#e2e0da" }} />
              <p className="text-sm" style={{ color: "#9a8e7e" }}>No confirmed sessions yet.</p>
              <p className="text-xs mt-0.5" style={{ color: "#b0a898" }}>Verify a payment to schedule a session.</p>
            </div>
          ) : (
            <div className="p-3 grid sm:grid-cols-2 gap-2.5 bg-white">
              {active.map(a => (
                <SessionCard key={a.id} apt={a} now={now}
                  onStart={startSession} onComplete={(id) => act(id, "complete")} onCancel={(id) => act(id, "cancel")}
                  busy={mutate.isPending} />
              ))}
            </div>
          )}
        </div>

        {/* Schedule & availability */}
        <ScheduleManager />

        {/* All appointments */}
        <div className="bg-white rounded-lg border" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "#f0ece4" }}>
            <div className="flex gap-0.5 flex-wrap">
              {[["all",`All (${appointments.length})`],["pending",`Pending (${pending.length})`],["sessions",`Sessions (${active.length})`],["completed",`Done (${completed.length})`],["archived","Archived"]].map(([v,l]) => (
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
              <AlertCircle className="h-7 w-7 mx-auto mb-2" style={{ color: "#e2e0da" }} />
              <p className="text-sm" style={{ color: "#9a8e7e" }}>No {filter === "all" ? "" : filter} appointments yet.</p>
              {filter === "all" && <Link href="/"><Button variant="link" className="mt-1 text-xs" style={{ color: GN }}>Go to storefront →</Button></Link>}
            </div>
          ) : (
            <div>{filtered.map(a => (
              <AppointmentRow key={a.id} apt={a} now={now}
                onStart={startSession}
                onComplete={(id) => act(id, "complete")}
                onVerify={(id) => act(id, "verify")}
                onDecline={(id) => act(id, "decline")}
                onCancel={(id) => act(id, "cancel")}
                busy={mutate.isPending} />
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
