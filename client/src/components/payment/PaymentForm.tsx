import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

  const handlePaymentSubmit = async (data: z.infer<typeof paymentFormSchema>) => {
    try {
      // Create payment record
      const paymentData: InsertPayment = {
        appointmentId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        reference: `${data.method}_${Date.now()}`
      };

      await apiRequest("POST", "/api/payments", paymentData);

      // Show success message with payment instructions
      const { instructions, details } = getPaymentInstructions(data.method);

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

      // Open payment service website in new tab
      const paymentSites = {
        ecocash: "https://www.econet.co.zw/ecocash",
        western_union: "https://www.westernunion.com/us/en/web/send-money",
        world_remit: "https://www.worldremit.com/en/zimbabwe",
        remitly: "https://www.remitly.com/us/en/zimbabwe"
      };

      if (paymentSites[data.method as keyof typeof paymentSites]) {
        window.open(paymentSites[data.method as keyof typeof paymentSites], '_blank');
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
          Select your preferred payment method and enter your details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={selectedMethod} onValueChange={setSelectedMethod}>
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-8">
            {PAYMENT_METHODS.map((method) => (
              <TabsTrigger 
                key={method.value} 
                value={method.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {method.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PAYMENT_METHODS.map((method) => (
            <TabsContent key={method.value} value={method.value}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePaymentSubmit)} className="space-y-6">
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

                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>{getPaymentInstructions(method.value).instructions}</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {getPaymentInstructions(method.value).details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                  >
                    Continue to {method.label} Payment
                  </Button>
                </form>
              </Form>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}