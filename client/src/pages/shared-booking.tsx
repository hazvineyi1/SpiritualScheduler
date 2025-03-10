import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added import
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
    <div className="container mx-auto px-4 pt-4">
      <Card className="max-w-2xl mx-auto shadow-none border-none">
        <CardContent className="p-0 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Share Your Booking</h2>
            <div className="flex items-center gap-2">
              <Input 
                value={currentUrl}
                readOnly
                className="flex-1 bg-gray-50"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(currentUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4">
            <h3 className="font-medium mb-4">Consultation Type</h3>
            <Select 
              value={appointment.type}
              disabled
              className="w-full mb-6"
            >
              <SelectTrigger>
                <SelectValue>{appointment.type}</SelectValue>
              </SelectTrigger>
            </Select>

            <h3 className="font-medium mb-4">Date & Time</h3>
            <p className="text-gray-700 mb-6">{formatDateTime(appointment.datetime)}</p>

            <form onSubmit={handleSubmitReference} className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Payment Reference</h3>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Enter your payment reference number"
                  className="w-full bg-gray-50"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={verifyPayment.isPending}
              >
                {verifyPayment.isPending ? "Verifying..." : "Submit Payment Reference"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}