import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS, generatePaymentReference } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Upload, CheckCircle2, Phone, CreditCard, FileImage } from "lucide-react";
import type { InsertPayment } from "@shared/schema";

interface PaymentFormProps {
  appointmentId: number;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentForm({ appointmentId, amount, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);

  const handleMethodSelect = async (method: string) => {
    const reference = generatePaymentReference(appointmentId, method);
    setPaymentReference(reference);
    setSelectedMethod(method);
    setPaymentCreated(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast({
        title: "Invalid file",
        description: "Please upload an image (JPG, PNG, WebP) or PDF.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const canConfirm = !!selectedMethod && whatsappNumber.trim().length >= 10 && !!proofFile;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      const paymentData: InsertPayment = {
        appointmentId,
        amount,
        currency: "USD",
        method: selectedMethod as InsertPayment["method"],
        reference: paymentReference,
      };

      const res = await apiRequest("POST", "/api/payments", paymentData);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Payment failed");

      await apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, {
        status: "confirmed",
      });

      setPaymentCreated(true);
      toast({
        title: "Booking submitted",
        description: "Your booking is pending verification. You'll receive a WhatsApp confirmation shortly.",
      });
      onSuccess();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to confirm payment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPaymentMethod = PAYMENT_METHODS.find((m) => m.value === selectedMethod);

  const steps = [
    { label: "Payment method", done: !!selectedMethod },
    { label: "WhatsApp number", done: whatsappNumber.trim().length >= 10 },
    { label: "Proof of payment", done: !!proofFile },
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Booking</CardTitle>
        <CardDescription>
          Amount due: <span className="font-semibold text-foreground">${amount} USD</span>
        </CardDescription>
        <div className="flex gap-3 pt-2">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <CheckCircle2
                className={`h-4 w-4 ${s.done ? "text-green-500" : "text-muted-foreground/40"}`}
              />
              <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1 — Choose payment method */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Step 1 — Choose payment method</span>
          </div>
          <div className="grid gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                onClick={() => handleMethodSelect(method.value)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedMethod === method.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{method.label}</span>
                  {selectedMethod === method.value && (
                    <Badge variant="outline" className="text-xs border-primary text-primary">Selected</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Send ${amount} USD via {method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment instructions — shown when method is selected */}
        {selectedPaymentMethod && (
          <Alert>
            <AlertDescription className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your reference number:</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{paymentReference}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(paymentReference)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Accordion type="single" collapsible>
                <AccordionItem value="instructions" className="border-0">
                  <AccordionTrigger className="text-sm py-1">View payment instructions</AccordionTrigger>
                  <AccordionContent>
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded-md mb-2">
                      {selectedPaymentMethod.instructions}
                    </pre>
                    <ul className="text-xs space-y-1">
                      {selectedPaymentMethod.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AlertDescription>
          </Alert>
        )}

        {/* Step 2 — WhatsApp number */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Step 2 — Your WhatsApp number</span>
          </div>
          <Input
            type="tel"
            placeholder="+263 7X XXX XXXX"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className={whatsappNumber.trim().length >= 10 ? "border-green-500" : ""}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your session link and booking confirmation will be sent here once payment is verified.
          </p>
        </div>

        {/* Step 3 — Proof of payment */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileImage className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Step 3 — Upload proof of payment</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {proofFile ? (
            <div className="rounded-lg border border-green-500 bg-green-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{proofFile.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </Button>
              </div>
              {proofPreview && (
                <img
                  src={proofPreview}
                  alt="Proof of payment"
                  className="max-h-40 rounded object-contain border"
                />
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 p-6 text-center transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload screenshot or PDF receipt
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, WebP or PDF — max 5 MB</p>
            </button>
          )}
        </div>

        {/* Confirm button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!canConfirm || isSubmitting}
          onClick={handleConfirm}
        >
          {isSubmitting ? "Submitting…" : "Confirm Booking"}
        </Button>

        {!canConfirm && (
          <p className="text-xs text-center text-muted-foreground">
            Complete all three steps above to confirm your booking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
