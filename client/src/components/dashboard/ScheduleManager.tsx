import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarCog, Loader2, Lock, Save, Check, X } from "lucide-react";
import type { AvailabilityConfig, DaySlot } from "@shared/schema";

const HERO   = "#eef3ea";
const BORDER = "#ddd8ce";
const GN      = "#4a7040";
const DARK    = "#263320";
const GOLD    = "#8a6a2a";

const WEEKDAYS = [
  { d: 0, label: "Sun" }, { d: 1, label: "Mon" }, { d: 2, label: "Tue" },
  { d: 3, label: "Wed" }, { d: 4, label: "Thu" }, { d: 5, label: "Fri" }, { d: 6, label: "Sat" },
];
const SLOT_LENGTHS = [30, 45, 60, 90];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ScheduleManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<AvailabilityConfig> | null>(null);
  const [date, setDate] = useState(todayStr());

  const { data: config, isLoading } = useQuery<AvailabilityConfig>({
    queryKey: ["/api/availability"],
  });

  // Local editable view of the weekly schedule.
  const view: AvailabilityConfig | undefined = config && { ...config, ...draft };

  const { data: slotData, isLoading: slotsLoading } = useQuery<{ date: string; slots: DaySlot[] }>({
    queryKey: ["/api/availability/slots", date],
    enabled: !!date,
    queryFn: async () => {
      const res = await fetch(`/api/availability/slots?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load slots");
      return (await res.json()).data;
    },
  });

  const saveSchedule = useMutation({
    mutationFn: async (payload: Partial<AvailabilityConfig>) => {
      const res = await apiRequest("PUT", "/api/availability", payload);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/availability"] });
      qc.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setDraft(null);
      toast({ title: "Schedule saved", description: "Your weekly availability is updated." });
    },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const toggleSlot = useMutation({
    mutationFn: async ({ datetime, close }: { datetime: string; close: boolean }) => {
      const res = await apiRequest("POST", `/api/availability/${close ? "block" : "unblock"}`, { datetime });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/availability"] });
      qc.invalidateQueries({ queryKey: ["/api/availability/slots"] });
    },
    onError: (e: Error) => toast({ title: "Couldn't update slot", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !view) {
    return (
      <div className="rounded-lg border bg-white p-6 flex items-center justify-center" style={{ borderColor: BORDER, color: "#9a8e7e" }}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading schedule…
      </div>
    );
  }

  const setView = (patch: Partial<AvailabilityConfig>) => setDraft(d => ({ ...d, ...patch }));
  const toggleWeekday = (d: number) => {
    const has = view.weekdays.includes(d);
    setView({ weekdays: has ? view.weekdays.filter(x => x !== d) : [...view.weekdays, d].sort() });
  };
  const dirty = draft !== null && JSON.stringify({ weekdays: view.weekdays, startHour: view.startHour, endHour: view.endHour, slotMinutes: view.slotMinutes })
    !== JSON.stringify({ weekdays: config!.weekdays, startHour: config!.startHour, endHour: config!.endHour, slotMinutes: config!.slotMinutes });

  const slots = slotData?.slots ?? [];

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ background: HERO, borderColor: "#e2e8da" }}>
        <CalendarCog className="h-4 w-4" style={{ color: GN }} />
        <span className="text-sm font-medium" style={{ color: DARK }}>Schedule &amp; Availability</span>
      </div>

      <div className="bg-white p-4 grid lg:grid-cols-2 gap-6">
        {/* Weekly schedule */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "#9a8e7e" }}>Open days</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {WEEKDAYS.map(({ d, label }) => {
              const on = view.weekdays.includes(d);
              return (
                <button key={d} onClick={() => toggleWeekday(d)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
                  style={{ borderColor: on ? GN : BORDER, background: on ? GN : "white", color: on ? "white" : "#9a8e7e" }}>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "#9a8e7e" }}>Opens</p>
              <select value={view.startHour} onChange={e => setView({ startHour: Number(e.target.value) })}
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white" style={{ borderColor: BORDER, color: DARK }}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "#9a8e7e" }}>Closes</p>
              <select value={view.endHour} onChange={e => setView({ endHour: Number(e.target.value) })}
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white" style={{ borderColor: BORDER, color: DARK }}>
                {Array.from({ length: 24 }, (_, h) => h + 1).map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "#9a8e7e" }}>Slot length</p>
              <select value={view.slotMinutes} onChange={e => setView({ slotMinutes: Number(e.target.value) })}
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white" style={{ borderColor: BORDER, color: DARK }}>
                {SLOT_LENGTHS.map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>

          {view.endHour <= view.startHour && (
            <p className="text-xs mb-2" style={{ color: "#b05050" }}>Closing time must be after opening time.</p>
          )}

          <Button size="sm" className="text-white" style={{ background: GN }}
            disabled={!dirty || view.endHour <= view.startHour || saveSchedule.isPending}
            onClick={() => saveSchedule.mutate({ weekdays: view.weekdays, startHour: view.startHour, endHour: view.endHour, slotMinutes: view.slotMinutes })}>
            {saveSchedule.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save weekly schedule
          </Button>
          {dirty && <span className="text-xs ml-2" style={{ color: GOLD }}>Unsaved changes</span>}
        </div>

        {/* Per-day open/close */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "#9a8e7e" }}>Open or close individual slots</p>
          <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm bg-white mb-3" style={{ borderColor: BORDER, color: DARK }} />

          {slotsLoading ? (
            <div className="flex items-center py-6" style={{ color: "#9a8e7e" }}><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : slots.length === 0 ? (
            <p className="text-xs py-4" style={{ color: "#b0a898" }}>This weekday is closed in your weekly schedule. Enable the day on the left to open slots.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {slots.map(slot => {
                if (slot.status === "past") {
                  return <div key={slot.datetime} className="rounded-md border py-1.5 text-xs text-center" style={{ borderColor: "#f0ece4", background: "#f7f5f0", color: "#cfc8ba" }}>{slot.label}</div>;
                }
                if (slot.status === "booked") {
                  return (
                    <div key={slot.datetime} title="Booked by a client" className="rounded-md border py-1.5 text-xs text-center flex items-center justify-center gap-1" style={{ borderColor: "#e2d9c2", background: "#fbf7ec", color: GOLD }}>
                      <Lock className="h-3 w-3" /> {slot.label}
                    </div>
                  );
                }
                const closed = slot.status === "closed";
                return (
                  <button key={slot.datetime} disabled={toggleSlot.isPending}
                    onClick={() => toggleSlot.mutate({ datetime: slot.datetime, close: !closed })}
                    title={closed ? "Closed — click to open" : "Open — click to close"}
                    className="rounded-md border py-1.5 text-xs text-center flex items-center justify-center gap-1 transition-colors"
                    style={{
                      borderColor: closed ? "#e6dfd2" : `${GN}55`,
                      background: closed ? "#f5f2ec" : "#eef6ea",
                      color: closed ? "#b0a898" : GN,
                    }}>
                    {closed ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />} {slot.label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3 text-[11px] mt-2" style={{ color: "#9a8e7e" }}>
            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" style={{ color: GN }} /> Open</span>
            <span className="inline-flex items-center gap-1"><X className="h-3 w-3" /> Closed</span>
            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" style={{ color: GOLD }} /> Booked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
