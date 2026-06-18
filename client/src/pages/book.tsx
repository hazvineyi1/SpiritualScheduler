import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { READINGS, FORMAT_LABELS, CATEGORY_LABELS } from "@shared/types";
import type { SessionFormat } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, CheckCircle2, Video, Mic, MessageSquare, Send, MapPin, Upload, FileImage, Phone, CreditCard } from "lucide-react";
import BookingCalendar from "@/components/calendar/BookingCalendar";

const FORMAT_ICONS: Record<string, any> = { video: Video, audio: Mic, chat: MessageSquare, async: Send, in_person: MapPin };

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
  { value: "ecocash", label: "EcoCash", desc: "Zimbabwe EcoCash wallet", instructions: "Send to merchant code 987654. Use your booking reference as the remark." },
  { value: "world_remit", label: "WorldRemit", desc: "International remittance", instructions: "Send to mobile money +263 77 123 4567. Include your reference in the note." },
  { value: "remitly", label: "Remitly", desc: "International remittance", instructions: "Send to EcoCash wallet +263 77 123 4567. Include reference in transfer notes." },
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf6f0" }}>
      <div className="text-center">
        <p className="text-stone-500 mb-4">Reading not found.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    </div>
  );

  const isLive = format && format !== "async";
  const finalPrice = reading.isFixed ? reading.price
    : isLive ? Math.round(reading.price * (DURATION_TIERS.find(d => d.value === duration)?.multiplier ?? 1))
    : Math.round(reading.price * (QUESTION_TIERS.find(q => q.value === questionCount)?.multiplier ?? 1));

  const paymentRef = paymentMethod ? `EB-${Date.now().toString(36).toUpperCase()}` : "";
  const selectedMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);

  const canStep0 = !!format && (!reading.isAdult || ageConfirmed);
  const canStep1 = format === "async" || !!selectedDate;
  const canStep2 = !!intake.clientName?.trim() && !!intake.mainQuestion?.trim();
  const canConfirm = !!paymentMethod && whatsapp.trim().length >= 10 && !!proofFile;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type) || file.size > 5242880) {
      toast({ title: "Invalid file", description: "Image or PDF, max 5 MB.", variant: "destructive" }); return;
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
      const res = await apiRequest("POST", "/api/appointments", {
        readingId: reading.id, readingName: reading.name, category: reading.category,
        format, datetime: selectedDate?.toISOString(),
        duration: isLive ? duration : undefined,
        questionCount: format === "async" ? questionCount : undefined,
        whatsappNumber: whatsapp.trim(), paymentMethod: paymentMethod!,
        paymentAmount: finalPrice, paymentReference: paymentRef,
        clientName: intake.clientName, intakeAnswers: intake,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Booking failed");
      setBookingId(json.data.id);
      setBookingDone(true);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Booking failed.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const STEPS = ["Format", "Schedule", "About You", "Payment"];
  const GN = "#4a6741"; // green natural

  if (bookingDone) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#faf6f0" }}>
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: "#2c2418" }}>You're in the queue</h2>
        <p className="text-stone-500 text-sm mb-1">{reading.name}</p>
        <p className="text-stone-400 text-xs mb-5">Booking #{bookingId} · ${finalPrice} USD · Pending verification</p>
        <div className="bg-white rounded-lg border p-4 text-sm text-left space-y-2 mb-5" style={{ borderColor: "#e5ddd0" }}>
          <p className="text-stone-600">✓ Ellie will verify your payment within ~24 hours.</p>
          <p className="text-stone-600">✓ Your session link and confirmation will be sent to WhatsApp: <strong>{whatsapp}</strong></p>
          <p className="text-stone-500 text-xs mt-1">Nothing more to do — sit back and await your reading. 🌿</p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full text-white" style={{ background: GN }}>Back to Readings</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#faf6f0" }}>
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10" style={{ borderColor: "#e5ddd0" }}>
        <div className="max-w-xl mx-auto px-4 py-3">
          <button onClick={() => step === 0 ? navigate("/") : setStep(s => s - 1)} className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm mb-2">
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "All Readings" : "Back"}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-sm" style={{ color: "#2c2418" }}>{reading.name}</h1>
              <p className="text-xs text-stone-400">{CATEGORY_LABELS[reading.category]} · ${reading.price} base</p>
            </div>
            <div className="flex gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors"
                    style={{ background: i < step ? GN : i === step ? "#c9a96e" : "#e5ddd0", color: i <= step ? "white" : "#9a9080" }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className="h-px w-3" style={{ background: i < step ? GN : "#e5ddd0" }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">

        {/* STEP 0 */}
        {step === 0 && (
          <div>
            <h2 className="font-medium mb-1" style={{ color: "#2c2418" }}>Choose format</h2>
            <p className="text-sm text-stone-400 mb-4">How would you like to receive this reading?</p>
            {reading.isAdult && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 flex items-start gap-2.5">
                <Checkbox id="age" checked={ageConfirmed} onCheckedChange={v => setAgeConfirmed(!!v)} className="mt-0.5" />
                <label htmlFor="age" className="text-sm text-red-700 cursor-pointer">I confirm I am 18 or older and consent to adult content.</label>
              </div>
            )}
            <div className="space-y-2 mb-5">
              {reading.formats.map(f => {
                const Icon = FORMAT_ICONS[f] || Send;
                const sel = format === f;
                return (
                  <button key={f} onClick={() => setFormat(f)} className="w-full text-left rounded-lg border p-3 transition-all flex items-center gap-3"
                    style={{ borderColor: sel ? GN : "#e5ddd0", background: sel ? "#f2f7f0" : "white" }}>
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: sel ? GN : "#9a9080" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#2c2418" }}>{FORMAT_LABELS[f]}</p>
                      <p className="text-xs text-stone-400">
                        {f === "video" && "Live video session — scheduled"} {f === "audio" && "Live audio call — scheduled"}
                        {f === "chat" && "Real-time text via WhatsApp"} {f === "async" && "Written/recorded delivery within ~24h"}
                        {f === "in_person" && "Ellie's studio, Harare, Zimbabwe"}
                      </p>
                    </div>
                    {sel && <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: GN }} />}
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setStep(1)} disabled={!canStep0} className="w-full text-white" style={{ background: GN }}>Continue →</Button>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 className="font-medium mb-1" style={{ color: "#2c2418" }}>
              {format === "async" ? "Choose questions" : "Choose duration & date"}
            </h2>
            <p className="text-sm text-stone-400 mb-4">
              {format === "async" ? "How many questions would you like answered?" : "Pick duration, then choose a date and time (Harare/CAT)."}
            </p>
            {format === "async" ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {QUESTION_TIERS.map(t => (
                  <button key={t.value} onClick={() => setQuestionCount(t.value)}
                    className="rounded-lg border p-3 text-left transition-all"
                    style={{ borderColor: questionCount === t.value ? GN : "#e5ddd0", background: questionCount === t.value ? "#f2f7f0" : "white" }}>
                    <p className="text-sm font-medium" style={{ color: "#2c2418" }}>{t.label}</p>
                    <p className="text-xs text-stone-400">${reading.isFixed ? reading.price : Math.round(reading.price * t.multiplier)} USD</p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {!reading.isFixed && (
                  <div className="mb-4">
                    <Label className="text-xs text-stone-500 mb-2 block">Session duration</Label>
                    <div className="flex gap-2">
                      {DURATION_TIERS.map(t => (
                        <button key={t.value} onClick={() => setDuration(t.value)}
                          className="flex-1 rounded-lg border py-2 text-center text-xs transition-all"
                          style={{ borderColor: duration === t.value ? GN : "#e5ddd0", background: duration === t.value ? "#f2f7f0" : "white", fontWeight: duration === t.value ? 600 : 400, color: "#2c2418" }}>
                          <div>{t.label}</div>
                          <div className="text-stone-400">${Math.round(reading.price * t.multiplier)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <BookingCalendar selected={selectedDate} onSelect={setSelectedDate} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg p-3 mt-4 mb-5" style={{ background: "#f2f7f0", border: `1px solid ${GN}33` }}>
              <span className="text-sm text-stone-600">Price for this booking</span>
              <span className="font-bold" style={{ color: GN }}>${finalPrice} USD</span>
            </div>
            <Button onClick={() => setStep(2)} disabled={!canStep1} className="w-full text-white" style={{ background: GN }}>Continue →</Button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 className="font-medium mb-1" style={{ color: "#2c2418" }}>About you</h2>
            <p className="text-sm text-stone-400 mb-4">Strictly confidential — only seen by Ellie.</p>
            <div className="space-y-4 mb-5">
              <div>
                <Label className="text-xs text-stone-500 mb-1.5 block">Full name *</Label>
                <Input placeholder="Your full name" value={intake.clientName} onChange={e => setIntake(p => ({ ...p, clientName: e.target.value }))} className="bg-white" />
              </div>
              <div>
                <Label className="text-xs text-stone-500 mb-1.5 block">Date of birth</Label>
                <Input type="date" value={intake.dob} onChange={e => setIntake(p => ({ ...p, dob: e.target.value }))} className="bg-white" />
              </div>
              <div>
                <Label className="text-xs text-stone-500 mb-1.5 block">Main question or focus *</Label>
                <textarea className="w-full rounded-md border border-input px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white"
                  rows={3} placeholder="What guidance are you seeking?" value={intake.mainQuestion}
                  onChange={e => setIntake(p => ({ ...p, mainQuestion: e.target.value }))} />
              </div>
              {reading.customIntake?.map(field => (
                <div key={field.field}>
                  <Label className="text-xs text-stone-500 mb-1.5 block">{field.label}</Label>
                  <Input placeholder={field.placeholder || field.label} value={intake[field.field] ?? ""}
                    onChange={e => setIntake(p => ({ ...p, [field.field]: e.target.value }))} className="bg-white" />
                </div>
              ))}
            </div>
            <Button onClick={() => setStep(3)} disabled={!canStep2} className="w-full text-white" style={{ background: GN }}>Continue →</Button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 className="font-medium mb-1" style={{ color: "#2c2418" }}>Payment & confirm</h2>
            <div className="flex items-center justify-between rounded-lg p-3 mb-5" style={{ background: "#f2f7f0", border: `1px solid ${GN}33` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "#2c2418" }}>{reading.name}</p>
                <p className="text-xs text-stone-400">{format && FORMAT_LABELS[format]}{selectedDate ? ` · ${selectedDate.toLocaleDateString()}` : ""}</p>
              </div>
              <span className="font-bold" style={{ color: GN }}>${finalPrice} USD</span>
            </div>

            <div className="space-y-5">
              {/* 1. Method */}
              <div>
                <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> 1. Payment method</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                      className="w-full text-left rounded-lg border p-3 transition-all"
                      style={{ borderColor: paymentMethod === m.value ? GN : "#e5ddd0", background: paymentMethod === m.value ? "#f2f7f0" : "white" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#2c2418" }}>{m.label}</p>
                          <p className="text-xs text-stone-400">{m.desc}</p>
                        </div>
                        {paymentMethod === m.value && <CheckCircle2 className="h-4 w-4" style={{ color: GN }} />}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedMethod && (
                  <div className="mt-2 rounded-lg p-3 text-xs" style={{ background: "#fffbf3", border: "1px solid #c9a96e44" }}>
                    <p className="font-medium mb-1" style={{ color: "#7a6030" }}>Instructions:</p>
                    <p className="text-stone-600">{selectedMethod.instructions}</p>
                    <p className="mt-1.5 font-mono bg-white px-2 py-1 rounded border text-stone-600" style={{ borderColor: "#e5ddd0" }}>Ref: {paymentRef}</p>
                  </div>
                )}
              </div>

              {/* 2. WhatsApp */}
              <div>
                <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> 2. Your WhatsApp number</p>
                <Input type="tel" placeholder="+263 7X XXX XXXX" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="bg-white" />
                <p className="text-xs text-stone-400 mt-1">Session link and confirmation sent here after verification.</p>
              </div>

              {/* 3. Proof */}
              <div>
                <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1.5"><FileImage className="h-3.5 w-3.5" /> 3. Upload proof of payment</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileChange} />
                {proofFile ? (
                  <div className="rounded-lg border p-3" style={{ borderColor: `${GN}66`, background: "#f2f7f0" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-stone-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-600" />{proofFile.name}</span>
                      <button className="text-xs text-stone-400 hover:text-stone-700" onClick={() => { setProofFile(null); setProofPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button>
                    </div>
                    {proofPreview && <img src={proofPreview} alt="Proof" className="max-h-28 rounded border object-contain" style={{ borderColor: "#e5ddd0" }} />}
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg border-2 border-dashed p-5 text-center hover:border-[#4a6741] transition-colors" style={{ borderColor: "#d5cdc0" }}>
                    <Upload className="h-5 w-5 mx-auto mb-1.5 text-stone-300" />
                    <p className="text-sm text-stone-400">Upload screenshot or PDF receipt</p>
                    <p className="text-xs text-stone-300 mt-0.5">JPG, PNG or PDF · max 5 MB</p>
                  </button>
                )}
              </div>

              <Button className="w-full text-white" size="default" disabled={!canConfirm || isSubmitting} onClick={handleConfirm} style={{ background: GN }}>
                {isSubmitting ? "Confirming…" : "Confirm Booking"}
              </Button>
              {!canConfirm && <p className="text-center text-xs text-stone-400">Complete all three steps above to confirm.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
