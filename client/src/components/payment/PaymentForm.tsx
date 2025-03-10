import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS, generatePaymentReference } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink } from "lucide-react";
import type { InsertPayment } from "@shared/schema";

interface PaymentFormProps {
  appointmentId: number;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentForm({ appointmentId, amount, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string>("");

  const handlePaymentMethodSelect = async (method: string) => {
    try {
      const reference = generatePaymentReference(appointmentId, method);
      setPaymentReference(reference);
      setSelectedMethod(method);

      // Create payment record
      const paymentData: InsertPayment = {
        appointmentId,
        amount,
        currency: "USD",
        method,
        reference
      };

      await apiRequest("POST", "/api/payments", paymentData);

      toast({
        title: "Payment Initiated",
        description: "Please follow the instructions to complete your payment.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const selectedPaymentMethod = PAYMENT_METHODS.find(m => m.value === selectedMethod);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Amount to pay: ${amount} USD
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedMethod ? (
          <div className="grid gap-4">
            {PAYMENT_METHODS.map((method) => (
              <Button
                key={method.value}
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
        ) : selectedPaymentMethod && (
          <div className="space-y-6">
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>Your payment reference: {paymentReference}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(paymentReference)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="instructions">
                <AccordionTrigger>Payment Instructions</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                      {selectedPaymentMethod.instructions}
                    </pre>
                    <div className="font-medium mt-2">Required Information:</div>
                    <ul className="list-disc list-inside text-sm">
                      {selectedPaymentMethod.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-col gap-4">
              <a
                href={selectedPaymentMethod.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" className="w-full">
                  Verify Payment Status
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedMethod(null);
                  setPaymentReference("");
                }}
              >
                Choose Different Payment Method
              </Button>

              <Button
                onClick={onSuccess}
                className="w-full"
              >
                Confirm Payment Complete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}