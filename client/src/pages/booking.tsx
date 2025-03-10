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

enum BookingStep {
  DETAILS,
  PAYMENT
}

export default function Booking() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [step, setStep] = useState<BookingStep>(BookingStep.DETAILS);

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      clientId: 1, // TODO: Get from auth
      datetime: "",
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
    onSuccess: () => {
      setStep(BookingStep.PAYMENT);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    }
  });

  async function onSubmit(data: InsertAppointment) {
    if (!selectedDate) {
      toast({
        title: "Select Date",
        description: "Please select an appointment date and time",
        variant: "destructive"
      });
      return;
    }

    try {
      await createAppointment.mutateAsync({
        ...data,
        datetime: selectedDate.toISOString()
      });
    } catch (error) {
      console.error("Appointment creation failed:", error);
    }
  }

  if (step === BookingStep.PAYMENT) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.value}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    toast({
                      title: "Payment Method Selected",
                      description: `You selected ${method.label}. Payment integration coming soon.`
                    });
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{method.label}</span>
                    <span className="text-sm text-muted-foreground">Click to select this payment method</span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
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