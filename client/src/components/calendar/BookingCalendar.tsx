import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { adjustToZimbabweTime } from "@/lib/utils";

interface BookingCalendarProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

export default function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  // Disable past dates and adjust to Zimbabwe timezone
  const disabledDays = {
    before: adjustToZimbabweTime(new Date()),
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          disabled={disabledDays}
          className="rounded-md"
        />
      </CardContent>
    </Card>
  );
}
