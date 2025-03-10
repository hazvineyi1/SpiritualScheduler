import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAYMENT_METHODS } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertPayment } from "@shared/schema";

const paymentFormSchema = z.object({
  amount: z.number().min(1),
  currency: z.string(),
  method: z.string(),
  reference: z.string().optional(),
  details: z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email address")
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
      amount,
      currency: "USD",
      method: selectedMethod,
      details: {
        name: "",
        phone: "",
        email: ""
      }
    }
  });

  const getPaymentLink = (method: string, data: any) => {
    switch (method) {
      case "ecocash":
        return `https://www.econet.co.zw/ecocash?phone=${encodeURIComponent(data.details.phone)}&amount=${data.amount}`;
      case "western_union":
        return "https://www.westernunion.com/us/en/web/send-money";
      case "world_remit":
        return "https://www.worldremit.com/en/zimbabwe";
      case "remitly":
        return "https://www.remitly.com/us/en/zimbabwe";
      default:
        return "";
    }
  };

  const getPaymentInstructions = (method: string) => {
    switch (method) {
      case "ecocash":
        return "Send payment to EcoCash number: +263 77 123 4567. Use your booking reference as the payment note.";
      case "western_union":
        return "Send to:\nName: [Practitioner Name]\nCity: Harare, Zimbabwe\nInclude your booking reference in the message.";
      case "world_remit":
        return "Send to mobile money:\nNumber: +263 77 123 4567\nName: [Practitioner Name]\nCity: Harare";
      case "remitly":
        return "Send to mobile wallet:\nNumber: +263 77 123 4567\nName: [Practitioner Name]\nLocation: Harare, Zimbabwe";
      default:
        return "Follow the payment instructions sent to your email.";
    }
  };

  const onSubmit = async (data: z.infer<typeof paymentFormSchema>) => {
    try {
      const paymentData: InsertPayment = {
        appointmentId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        reference: `${data.method}_${Date.now()}`
      };

      await apiRequest("POST", "/api/payments", paymentData);

      // Get payment link and instructions
      const paymentLink = getPaymentLink(data.method, data);
      const instructions = getPaymentInstructions(data.method);

      // Show payment instructions
      toast({
        title: "Payment Instructions",
        description: instructions,
      });

      // Open payment link in new tab if available
      if (paymentLink) {
        window.open(paymentLink, '_blank');
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={selectedMethod} onValueChange={setSelectedMethod}>
          <TabsList className="grid grid-cols-2 lg:grid-cols-4">
            {PAYMENT_METHODS.map((method) => (
              <TabsTrigger key={method.value} value={method.value}>
                {method.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PAYMENT_METHODS.map((method) => (
            <TabsContent key={method.value} value={method.value}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                  {method.value === "ecocash" && (
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

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full"
                    >
                      Pay {amount} USD with {method.label}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}