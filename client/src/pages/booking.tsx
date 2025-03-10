import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookingCalendar from "@/components/calendar/BookingCalendar";
import { CONSULTATION_TYPES, DURATION_OPTIONS, PAYMENT_METHODS } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Booking() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const form = useForm({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      clientId: 1, // TODO: Get from auth
      datetime: "",
      duration: 30,
      type: "divination",
      consultationDetails: { description: "" }
    }
  });

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been scheduled successfully."
      });
      form.reset();
      setSelectedDate(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    }
  });

  function onSubmit(data: any) {
    if (!selectedDate) {
      toast({
        title: "Select Date",
        description: "Please select an appointment date",
        variant: "destructive"
      });
      return;
    }
    createAppointment.mutate({
      ...data,
      datetime: selectedDate.toISOString()
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Book a Spiritual Consultation</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <BookingCalendar 
                selected={selectedDate}
                onSelect={setSelectedDate}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultation Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONSULTATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map(duration => (
                          <SelectItem key={duration.value} value={duration.value.toString()}>
                            {duration.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consultationDetails.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultation Details</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Briefly describe your needs" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={createAppointment.isPending}
              >
                {createAppointment.isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
