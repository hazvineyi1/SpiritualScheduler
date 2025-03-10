import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PAYMENT_METHODS } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertPayment } from "@shared/schema";

interface PaymentFormProps {
  appointmentId: number;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentForm({ appointmentId, amount, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].value);

  const handlePaymentMethodSelect = async (method: string) => {
    try {
      // Create payment record
      const paymentData: InsertPayment = {
        appointmentId,
        amount,
        currency: "USD",
        method,
        reference: `${method}_${Date.now()}`
      };

      await apiRequest("POST", "/api/payments", paymentData);

      // Open payment site in new tab
      const paymentSites = {
        ecocash: "https://www.econet.co.zw/ecocash",
        western_union: "https://www.westernunion.com/us/en/web/send-money/zimbabwe",
        world_remit: "https://www.worldremit.com/en/zimbabwe",
        remitly: "https://www.remitly.com/us/en/zimbabwe"
      };

      if (paymentSites[method as keyof typeof paymentSites]) {
        window.open(paymentSites[method as keyof typeof paymentSites], '_blank');
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Select your preferred payment method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4">
            {PAYMENT_METHODS.map((method) => (
              <Button
                key={method.value}
                type="button"
                variant="outline"
                className="w-full h-auto p-4 justify-start"
                onClick={() => handlePaymentMethodSelect(method.value)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{method.label}</span>
                  <span className="text-sm text-muted-foreground">
                    Pay {amount} USD via {method.label}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}