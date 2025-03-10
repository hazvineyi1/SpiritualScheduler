import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy } from "lucide-react";
import { type Appointment } from "@shared/schema";

export default function SharedBooking() {
  const { toast } = useToast();
  const [, params] = useRoute("/shared/:id");
  const bookingId = params?.id;
  const [paymentRef, setPaymentRef] = useState("");

  const { data: appointment, isLoading, error } = useQuery<Appointment>({
    queryKey: ["/api/appointments/shared", bookingId],
    enabled: !!bookingId,
  });

  const verifyPayment = useMutation({
    mutationFn: async (data: { reference: string }) => {
      const res = await apiRequest("POST", `/api/appointments/${bookingId}/verify-payment`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Verified",
        description: "Your payment reference has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify payment. Please check your reference number.",
        variant: "destructive"
      });
    }
  });

  const handleSubmitReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRef.trim()) {
      toast({
        title: "Error",
        description: "Please enter your payment reference number",
        variant: "destructive"
      });
      return;
    }
    await verifyPayment.mutateAsync({ reference: paymentRef });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Booking link copied to clipboard",
    });
  };

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

  const currentUrl = window.location.href;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Share Your Booking</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-2">
            <Input 
              value={currentUrl}
              readOnly
              className="flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(currentUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <h3 className="font-medium mb-2">Consultation Type</h3>
              <p className="text-lg capitalize">{appointment.type}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Date & Time</h3>
              <p className="text-lg">{formatDateTime(appointment.datetime)}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Duration</h3>
              <p className="text-lg">{appointment.duration} minutes</p>
            </div>
          </div>

          <form onSubmit={handleSubmitReference} className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Payment Reference</h3>
              <Input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Enter your payment reference number"
                className="w-full"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={verifyPayment.isPending}
            >
              {verifyPayment.isPending ? "Verifying..." : "Submit Payment Reference"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}