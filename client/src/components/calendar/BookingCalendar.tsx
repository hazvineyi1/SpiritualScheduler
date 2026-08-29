import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { adjustToZimbabweTime } from "@/lib/utils";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import type { AvailabilityConfig, DaySlot } from "@shared/schema";

const HERO   = "#f0ead9";
const BORDER = "#ddd2bc";
const GN     = "#355e4a";
const DARK   = "#1c1712";

interface BookingCalendarProps {
  selected: string | null;
  onSelect: (iso: string | null) => void;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: config } = useQuery<AvailabilityConfig>({
    queryKey: ["/api/availability"],
  });

  const dateStr = selectedDate ? toDateStr(selectedDate) : null;
  const { data: slotData, isLoading: slotsLoading } = useQuery<{ date: string; slots: DaySlot[] }>({
    queryKey: ["/api/availability/slots", dateStr],
    enabled: !!dateStr,
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await fetch(`/api/availability/slots?date=${dateStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load slots");
      const json = await res.json();
      return json.data;
    },
  });

  const closedWeekdays = config
    ? [0, 1, 2, 3, 4, 5, 6].filter(d => !config.weekdays.includes(d))
    : [];
  const disabledDays = [
    { before: adjustToZimbabweTime(new Date()) },
    ...(closedWeekdays.length ? [{ dayOfWeek: closedWeekdays }] : []),
  ];

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onSelect(null);
    }
  };

  const slots = slotData?.slots ?? [];
  const bookable = slots.filter(s => s.status === "available");
  const dayIsOpen = slots.length > 0;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-lg border bg-white" style={{ borderColor: BORDER }}>
        <Calendar
          mode="single"
          selected={selectedDate as any}
          onSelect={handleDateSelect}
          disabled={disabledDays}
          className="rounded-md"
        />
        <div className="px-3 pb-3 pt-1 flex items-center gap-3 text-[11px]" style={{ color: "#9a8e7e" }}>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: GN }} /> Open</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#ddd2bc" }} /> Closed / past</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        {!selectedDate ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center">
            <p className="text-sm" style={{ color: "#9a8e7e" }}>Pick a date to see available times.</p>
            <p className="text-xs mt-1" style={{ color: "#b0a898" }}>Greyed-out days are closed.</p>
          </div>
        ) : (
          <>
            <h3 className="font-medium mb-1 text-sm" style={{ color: DARK }}>
              {selectedDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <p className="text-xs mb-3" style={{ color: "#9a8e7e" }}>
              All times shown in Zimbabwe time (CAT).
            </p>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-10" style={{ color: "#9a8e7e" }}>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading times…
              </div>
            ) : !dayIsOpen ? (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: "#9a8e7e" }}>VaShava isn't available on this day.</p>
                <p className="text-xs mt-1" style={{ color: "#b0a898" }}>Please choose another date.</p>
              </div>
            ) : bookable.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium" style={{ color: "#a06030" }}>Fully booked</p>
                <p className="text-xs mt-1" style={{ color: "#b0a898" }}>No open times left on this day — please pick another date.</p>
              </div>
            ) : (
              <ScrollArea className="h-[260px] pr-2">
                <div className="grid grid-cols-2 gap-2">
                  {slots.filter(s => s.status !== "past").map((slot) => {
                    const isSelected = selected === slot.datetime;
                    if (slot.status === "available") {
                      return (
                        <button
                          key={slot.datetime}
                          onClick={() => onSelect(slot.datetime)}
                          className="rounded-lg border py-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                          style={{
                            borderColor: isSelected ? GN : BORDER,
                            background: isSelected ? GN : "white",
                            color: isSelected ? "white" : DARK,
                          }}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {slot.label}
                        </button>
                      );
                    }
                    // booked or closed → shown but disabled
                    return (
                      <div
                        key={slot.datetime}
                        className="rounded-lg border py-2 text-sm flex items-center justify-center gap-1.5 cursor-not-allowed"
                        style={{ borderColor: "#ece8df", background: "#f7f5f0", color: "#bdb6a8" }}
                        title={slot.status === "booked" ? "Already booked" : "Closed by VaShava"}
                      >
                        <Lock className="h-3 w-3" />
                        <span className="line-through">{slot.label}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>
    </div>
  );
}
