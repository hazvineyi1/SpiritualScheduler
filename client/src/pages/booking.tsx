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
import { CONSULTATION_TYPES } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertAppointment } from "@shared/schema";
import PaymentForm from "@/components/payment/PaymentForm";
import { Copy } from "lucide-react";

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
      duration: 60,
      type: "divination",
      phoneNumber: "", // Added phone number field
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
      description: "Your appointment has been successfully booked.",
    });

    // Show booking confirmation with shareable link
    const shareableLink = `${window.location.origin}/shared/${appointmentId}`;

    toast({
      title: "Share Your Booking",
      description: (
        <div className="flex items-center gap-2">
          <Input 
            type="text" 
            value={shareableLink} 
            readOnly 
            className="flex-1 bg-muted px-2 py-1 rounded text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(shareableLink);
              toast({
                title: "Link Copied",
                description: "Booking link copied to clipboard",
              });
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
      duration: 10000, // Show for 10 seconds
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="tel"
                        placeholder="Enter your phone number (e.g. +263...)" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                      <Input 
                        {...field} 
                        type="text"
                        placeholder="Briefly describe your needs" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600"
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