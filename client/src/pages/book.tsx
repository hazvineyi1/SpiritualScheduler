import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { READINGS, FORMAT_LABELS, CATEGORY_LABELS } from "@shared/types";
import type { SessionFormat } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, CheckCircle2, Video, Mic, MessageSquare, Send, MapPin, Clock, Upload, FileImage, CreditCard, Phone } from "lucide-react";
import BookingCalendar from "@/components/calendar/BookingCalendar";

const FORMAT_ICONS: Record<string, any> = { video: Video, audio: Mic, chat: MessageSquare, async: Send, in_person: MapPin };
const FORMAT_COLORS: Record<string, string> = { video: "border-blue-200 bg-blue-50 text-blue-800", audio: "border-purple-200 bg-purple-50 text-purple-800", chat: "border-green-200 bg-green-50 text-green-800", async: "border-amber-200 bg-amber-50 text-amber-800", in_person: "border-rose-200 bg-rose-50 text-rose-800" };

const DURATION_TIERS = [
  { label: "15 min", value: 15, multiplier: 0.6 },
  { label: "30 min", value: 30, multiplier: 1.0 },
  { label: "45 min", value: 45, multiplier: 1.5 },
  { label: "60 min", value: 60, multiplier: 2.0 },
];
const QUESTION_TIERS = [
  { label: "1 Question", value: 1, multiplier: 0.5 },
  { label: "3 Questions", value: 3, multiplier: 1.0 },
  { label: "5 Questions", value: 5, multiplier: 1.5 },
  { label: "Unlimited", value: 99, multiplier: 2.5 },
];
const PAYMENT_METHODS = [
  { value: "ecocash", label: "EcoCash", desc: "Zimbabwe EcoCash wallet", instructions: "Send to merchant code 987654. Use your payment reference as the remark." },
  { value: "world_remit", label: "WorldRemit", desc: "International remittance", instructions: "Send to mobile money +263 77 123 4567. Include your reference in the note." },
  { value: "remitly", label: "Remitly", desc: "International remittance", instructions: "Send to EcoCash wallet +263 77 123 4567. Include reference in notes." },
] as const;

export default function Book() {
  const { readingId } = useParams<{ readingId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const reading = READINGS.find(r => r.id === parseInt(readingId ?? ""));

  const [step, setStep] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [format, setFormat] = useState<SessionFormat | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState(30);
  const [questionCount, setQuestionCount] = useState(3);
  const [intake, setIntake] = useState<Record<string, string>>({ clientName: "", dob: "", mainQuestion: "" });
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_METHODS[number]["value"] | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  if (!reading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Reading not found.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    </div>
  );

  const isLive = format && format !== "async";
  const basePrice = reading.price;
  const currentMultiplier = isLive
    ? (DURATION_TIERS.find(d => d.value === duration)?.multiplier ?? 1)
    : (QUESTION_TIERS.find(q => q.value === questionCount)?.multiplier ?? 1);
  const finalPrice = reading.isFixed ? basePrice : Math.round(basePrice * currentMultiplier);

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);
  const paymentRef = paymentMethod ? `${paymentMethod.toUpperCase()}-EB-${Date.now().toString(36).toUpperCase()}` : "";

  const canProceedStep0 = !!format && (!reading.isAdult || ageConfirmed);
  const canProceedStep1 = format === "async" ? true : !!selectedDate;
  const canProceedStep2 = !!intake.clientName?.trim() && !!intake.mainQuestion?.trim();
  const canConfirm = !!paymentMethod && whatsapp.trim().length >= 10 && !!proofFile;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: "Invalid file", description: "Image or PDF, max 5 MB.", variant: "destructive" });
      return;
    }
    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setProofPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else setProofPreview(null);
  };

  const handleConfirm = async () => {
    if (!canConfirm || !format) return;
    setIsSubmitting(true);
    try {
      const payload = {
        readingId: reading.id,
        readingName: reading.name,
        category: reading.category,
        format,
        datetime: selectedDate?.toISOString(),
        duration: isLive ? duration : undefined,
        questionCount: format === "async" ? questionCount : undefined,
        whatsappNumber: whatsapp.trim(),
        paymentMethod: paymentMethod!,
        paymentAmount: finalPrice,
        paymentReference: paymentRef,
        clientName: intake.clientName,
        intakeAnswers: intake,
      };
      const res = await apiRequest("POST", "/api/appointments", payload);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Booking failed");
      setBookingId(json.data.id);
      setBookingDone(true);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Booking failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS = ["Format", "Schedule", "About You", "Payment"];

  if (bookingDone) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You're in the queue!</h2>
        <p className="text-muted-foreground mb-1"><strong>{reading.name}</strong></p>
        <p className="text-muted-foreground text-sm mb-6">Booking #{bookingId} · ${finalPrice} USD · Pending verification</p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 mb-6 text-left space-y-1.5">
          <p>✓ Your booking has been received by Ellie.</p>
          <p>✓ Ellie will verify your payment within ~24 hours.</p>
          <p>✓ Once verified, your session link and confirmation will be sent to your WhatsApp: <strong>{whatsapp}</strong></p>
          <p>✓ Nothing more to do — sit back and await your reading. 🌿</p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full">Back to Readings</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-[#1a0a3e] pt-4 pb-6 px-4">
        <div className="max-w-xl mx-auto">
          <button onClick={() => step === 0 ? navigate("/") : setStep(s => s - 1)} className="flex items-center gap-1 text-purple-300 hover:text-white text-sm mb-4 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "All Readings" : "Back"}
          </button>
          <h1 className="text-white font-bold text-xl mb-0.5">{reading.name}</h1>
          <p className="text-purple-300 text-sm">{CATEGORY_LABELS[reading.category]} · ${reading.price} base price</p>
          <div className="flex gap-3 mt-5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? "bg-green-500 text-white" : i === step ? "bg-amber-400 text-[#1a0a3e]" : "bg-white/10 text-purple-400"}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-amber-400 font-medium" : "text-purple-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? "bg-green-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* STEP 0: FORMAT */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Choose your format</h2>
            <p className="text-muted-foreground text-sm mb-6">How would you like to receive this reading?</p>
            {reading.isAdult && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                <Checkbox id="age" checked={ageConfirmed} onCheckedChange={v => setAgeConfirmed(!!v)} />
                <label htmlFor="age" className="text-sm text-red-800 cursor-pointer">I confirm that I am 18 years of age or older and consent to adult content in this reading.</label>
              </div>
            )}
            <div className="space-y-3 mb-8">
              {reading.formats.map(f => {
                const Icon = FORMAT_ICONS[f] || Send;
                return (
                  <button key={f} onClick={() => setFormat(f)} className={`w-full text-left rounded-xl border-2 p-4 transition-all ${format === f ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${FORMAT_COLORS[f]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{FORMAT_LABELS[f]}</p>
                        <p className="text-xs text-muted-foreground">
                          {f === "video" && "Live video session — scheduled appointment"}
                          {f === "audio" && "Live audio call — scheduled appointment"}
                          {f === "chat" && "Real-time text delivered via WhatsApp"}
                          {f === "async" && "Private written/recorded reading delivered within ~24h"}
                          {f === "in_person" && "At Ellie's studio in Harare, Zimbabwe"}
                        </p>
                      </div>
                      {format === f && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setStep(1)} disabled={!canProceedStep0} className="w-full">Continue to Schedule</Button>
          </div>
        )}

        {/* STEP 1: SCHEDULE */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Customise & schedule</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {format === "async" ? "Choose how many questions you'd like answered." : "Pick your duration, date, and time slot (Harare/CAT)."}
            </p>

            {format === "async" ? (
              <div className="mb-6">
                <Label className="mb-2 block text-sm font-medium">Number of questions</Label>
                <div className="grid grid-cols-2 gap-3">
                  {QUESTION_TIERS.map(t => (
                    <button key={t.value} onClick={() => setQuestionCount(t.value)} className={`rounded-xl border-2 p-3 text-left transition-all ${questionCount === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">${reading.isFixed ? reading.price : Math.round(reading.price * t.multiplier)} USD</p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <Clock className="h-4 w-4 inline mr-1" /> Delivered within ~24 hours. You'll receive it on your WhatsApp.
                </div>
              </div>
            ) : (
              <div className="mb-6">
                {!reading.isFixed && (
                  <div className="mb-5">
                    <Label className="mb-2 block text-sm font-medium">Session duration</Label>
                    <div className="flex gap-2">
                      {DURATION_TIERS.map(t => (
                        <button key={t.value} onClick={() => setDuration(t.value)} className={`flex-1 rounded-lg border-2 py-2 text-center text-sm transition-all ${duration === t.value ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40"}`}>
                          <div>{t.label}</div>
                          <div className="text-xs text-muted-foreground">${Math.round(reading.price * t.multiplier)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <BookingCalendar selected={selectedDate} onSelect={setSelectedDate} />
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
              <span className="text-sm font-medium">Price for this booking</span>
              <span className="text-xl font-bold text-primary">${finalPrice} USD</span>
            </div>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">Continue to Details</Button>
          </div>
        )}

        {/* STEP 2: INTAKE */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">About you</h2>
            <p className="text-muted-foreground text-sm mb-6">Your answers are strictly confidential and only seen by Ellie.</p>
            <div className="space-y-4 mb-8">
              <div>
                <Label htmlFor="name" className="mb-1.5 block">Full name *</Label>
                <Input id="name" placeholder="Your full name" value={intake.clientName} onChange={e => setIntake(p => ({ ...p, clientName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="dob" className="mb-1.5 block">Date of birth *</Label>
                <Input id="dob" type="date" value={intake.dob} onChange={e => setIntake(p => ({ ...p, dob: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="question" className="mb-1.5 block">Main question or focus *</Label>
                <textarea id="question" className="w-full rounded-lg border border-input px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={3} placeholder="What is the main thing you want guidance on?" value={intake.mainQuestion} onChange={e => setIntake(p => ({ ...p, mainQuestion: e.target.value }))} />
              </div>
              {reading.customIntake?.map(field => (
                <div key={field.field}>
                  <Label htmlFor={field.field} className="mb-1.5 block">{field.label}</Label>
                  <Input id={field.field} placeholder={field.placeholder || field.label} value={intake[field.field] ?? ""} onChange={e => setIntake(p => ({ ...p, [field.field]: e.target.value }))} />
                </div>
              ))}
            </div>
            <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="w-full">Continue to Payment</Button>
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Payment & confirmation</h2>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{reading.name}</p>
                <p className="text-xs text-muted-foreground">{format && FORMAT_LABELS[format]} {selectedDate ? `· ${selectedDate.toLocaleDateString()}` : ""}</p>
              </div>
              <span className="text-2xl font-bold text-primary">${finalPrice}</span>
            </div>

            <div className="space-y-6">
              {/* Step 1: Method */}
              <div>
                <div className="flex items-center gap-2 mb-3"><CreditCard className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">1. Choose payment method</span></div>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)} className={`w-full text-left rounded-xl border-2 p-3 transition-all ${paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                        {paymentMethod === m.value && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedMethod && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <p className="font-medium mb-1">Instructions:</p>
                    <p>{selectedMethod.instructions}</p>
                    <p className="mt-1.5 font-mono text-xs bg-amber-100 px-2 py-1 rounded">Reference: {paymentRef}</p>
                  </div>
                )}
              </div>

              {/* Step 2: WhatsApp */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">2. Your WhatsApp number</span></div>
                <Input type="tel" placeholder="+263 7X XXX XXXX" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={whatsapp.trim().length >= 10 ? "border-green-500" : ""} />
                <p className="text-xs text-muted-foreground mt-1">Session link and confirmation will be sent here once payment is verified.</p>
              </div>

              {/* Step 3: Proof */}
              <div>
                <div className="flex items-center gap-2 mb-3"><FileImage className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">3. Upload proof of payment</span></div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileChange} />
                {proofFile ? (
                  <div className="rounded-xl border border-green-500 bg-green-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-800">{proofFile.name}</span></div>
                      <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setProofFile(null); setProofPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button>
                    </div>
                    {proofPreview && <img src={proofPreview} alt="Proof" className="max-h-36 rounded object-contain border" />}
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 text-center transition-colors">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload screenshot or PDF receipt</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP or PDF · max 5 MB</p>
                  </button>
                )}
              </div>

              <Button className="w-full" size="lg" disabled={!canConfirm || isSubmitting} onClick={handleConfirm}>
                {isSubmitting ? "Confirming…" : "Confirm Booking"}
              </Button>
              {!canConfirm && <p className="text-xs text-center text-muted-foreground">Complete all three steps above to confirm.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
