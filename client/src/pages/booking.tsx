import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookingCalendar from "@/components/calendar/BookingCalendar";
import { CONSULTATION_TYPES, PAYMENT_METHODS } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertAppointment } from "@shared/schema";
import PaymentForm from "@/components/payment/PaymentForm";

enum BookingStep {
  DETAILS,
  PAYMENT
}

export default function Booking() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [step, setStep] = useState<BookingStep>(BookingStep.DETAILS);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      clientId: 1, // TODO: Get from auth
      datetime: new Date().toISOString(),
      duration: 60, // Fixed duration
      type: "divination",
      consultationDetails: { description: "" }
    }
  });

  const createAppointment = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Appointment created successfully");
      setAppointmentId(data.id);
      setStep(BookingStep.PAYMENT);
    },
    onError: (error: Error) => {
      console.error("Appointment creation failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (formData: InsertAppointment) => {
    if (!selectedDate) {
      toast({
        title: "Select Date",
        description: "Please select an appointment date and time",
        variant: "destructive"
      });
      return;
    }

    try {
      const appointmentData = {
        ...formData,
        datetime: selectedDate.toISOString(),
      };
      console.log("Submitting appointment:", appointmentData);
      await createAppointment.mutateAsync(appointmentData);
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Booking Confirmed",
      description: "Your appointment has been successfully booked. Check your email for details.",
    });
    // Reset form and state
    form.reset();
    setSelectedDate(null);
    setStep(BookingStep.DETAILS);
    setAppointmentId(null);
  };

  if (step === BookingStep.PAYMENT && appointmentId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PaymentForm
          appointmentId={appointmentId}
          amount={50} // Fixed amount for now
          onSuccess={handlePaymentSuccess}
        />
      </div>
    );
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
                    <FormMessage />
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
                    <FormMessage />
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

              {/* Debug form errors */}
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-xs text-red-500">
                  {JSON.stringify(form.formState.errors, null, 2)}
                </pre>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}