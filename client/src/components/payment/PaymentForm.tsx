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

const paymentFormSchema = z.object({
  details: z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
  })
});

interface PaymentFormProps {
  appointmentId: number;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentForm({ appointmentId, amount, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].value);

  const form = useForm({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      details: {
        name: "",
        email: "",
        phone: ""
      }
    }
  });

  const getPaymentInstructions = (method: string) => {
    switch (method) {
      case "ecocash":
        return {
          instructions: "Send payment to our registered EcoCash number:",
          details: [
            "Number: +263 77 123 4567",
            "Amount: $" + amount + " USD",
            "Reference: Include your name and booking ID"
          ]
        };
      case "western_union":
        return {
          instructions: "Send money to our representative in Zimbabwe:",
          details: [
            "Recipient Name: John Doe",
            "City: Harare",
            "Country: Zimbabwe",
            "Amount: $" + amount + " USD"
          ]
        };
      case "world_remit":
        return {
          instructions: "Send to our WorldRemit registered account:",
          details: [
            "Mobile Money Number: +263 77 123 4567",
            "Recipient Name: John Doe",
            "City: Harare, Zimbabwe",
            "Amount: $" + amount + " USD"
          ]
        };
      case "remitly":
        return {
          instructions: "Send to our Remitly registered account:",
          details: [
            "Mobile Wallet: +263 77 123 4567",
            "Recipient Name: John Doe",
            "Location: Harare, Zimbabwe",
            "Amount: $" + amount + " USD"
          ]
        };
      default:
        return {
          instructions: "Please select a payment method",
          details: []
        };
    }
  };

  const paymentSites = {
    ecocash: "https://www.econet.co.zw/ecocash",
    western_union: "https://www.westernunion.com/us/en/web/send-money/zimbabwe",
    world_remit: "https://www.worldremit.com/en/zimbabwe",
    remitly: "https://www.remitly.com/us/en/zimbabwe"
  };

  const handlePaymentMethodSelect = async (method: string) => {
    try {
      const formData = form.getValues();

      // Create payment record
      const paymentData: InsertPayment = {
        appointmentId,
        amount,
        currency: "USD",
        method,
        reference: `${method}_${Date.now()}`
      };

      await apiRequest("POST", "/api/payments", paymentData);

      // Show payment instructions
      const { instructions, details } = getPaymentInstructions(method);
      toast({
        title: "Payment Instructions",
        description: (
          <div className="space-y-2">
            <p>{instructions}</p>
            <ul className="list-disc pl-4 space-y-1">
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
        ),
        duration: 10000,
      });

      // Open payment site in new tab
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
        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="details.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your full name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="Enter your email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMethod === "ecocash" && (
              <FormField
                control={form.control}
                name="details.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your EcoCash number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.value}
                  type="button"
                  variant="outline"
                  className="w-full h-auto p-4 justify-start"
                  onClick={() => {
                    setSelectedMethod(method.value);
                    handlePaymentMethodSelect(method.value);
                  }}
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

            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p>{getPaymentInstructions(selectedMethod).instructions}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {getPaymentInstructions(selectedMethod).details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}