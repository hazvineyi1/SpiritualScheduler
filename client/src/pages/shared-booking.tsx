import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { type Appointment } from "@shared/schema";

export default function SharedBooking() {
  const [, params] = useRoute("/shared/:id");
  const bookingId = params?.id;

  const { data: appointment, isLoading, error } = useQuery<Appointment>({
    queryKey: ["/api/appointments/shared", bookingId],
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The booking link you're trying to access is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Spiritual Consultation Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Consultation Type</p>
            <p className="text-lg">{appointment.type}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Date & Time</p>
            <p className="text-lg">{formatDateTime(appointment.datetime)}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Duration</p>
            <p className="text-lg">{appointment.duration} minutes</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Status</p>
            <p className="text-lg capitalize">{appointment.status}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
