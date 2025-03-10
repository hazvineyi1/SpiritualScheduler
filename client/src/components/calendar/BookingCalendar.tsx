import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { adjustToZimbabweTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

// Generate time slots from 9 AM to 5 PM
const generateTimeSlots = (date: Date) => {
  const slots = [];
  const startHour = 9;
  const endHour = 17;

  for (let hour = startHour; hour < endHour; hour++) {
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0);
    slots.push(slotTime);
  }
  return slots;
};

export default function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Disable past dates and adjust to Zimbabwe timezone
  const disabledDays = {
    before: adjustToZimbabweTime(new Date()),
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // Clear time selection when date changes
      onSelect(null);
    }
  };

  const handleTimeSelect = (time: Date) => {
    onSelect(time);
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            className="rounded-md"
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">Available Time Slots</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time.toISOString()}
                    variant={selected?.getTime() === time.getTime() ? "default" : "outline"}
                    className={cn(
                      "w-full justify-start",
                      selected?.getTime() === time.getTime() && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}