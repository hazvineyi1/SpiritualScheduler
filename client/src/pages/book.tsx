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
const BG   = "#fafaf7";
const HERO = "#eef3ea";
const BORDER = "#ddd8ce";
const GN   = "#4a7040";
const DARK = "#263320";
const GOLD = "#8a6a2a";

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
  { value: "ecocash", label: "EcoCash USD", desc: "Zimbabwe EcoCash (USD)", instructions: "Send USD to Davidzo Ellen Mubwandarikwa on +263783402890. Use your booking reference as the remark." },
  { value: "innbucks", label: "InnBucks", desc: "InnBucks mobile wallet", instructions: "Send to Davidzo Ellen Mubwandarikwa on +263783402890. Include your booking reference." },
  { value: "world_remit", label: "WorldRemit", desc: "International mobile money", instructions: "Send via the mobile money option (NOT cash pick-up) to Davidzo Ellen Mubwandarikwa on +263783402890. Include your reference in the note." },
  { value: "remitly", label: "Remitly", desc: "International money transfer", instructions: "Send via the mobile money option (NOT cash pick-up) to Davidzo Ellen Mubwandarikwa on +263783402890. Include your reference in the note." },
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
  const [paymentReference, setPaymentReference] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  if (!reading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-center">
        <p className="text-sm mb-4" style={{ color: "#9a8e7e" }}>Reading not found.</p>
        <Button onClick={() => navigate("/")} style={{ background: GN, color: "white" }}>Back to Home</Button>
      </div>
    </div>
  );

  const isLive = format && format !== "async";
  const finalPrice = reading.isFixed ? reading.price
    : isLive ? Math.round(reading.price * (DURATION_TIERS.find(d => d.value === duration)?.multiplier ?? 1))
    : Math.round(reading.price * (QUESTION_TIERS.find(q => q.value === questionCount)?.multiplier ?? 1));

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);

  const canStep0 = !!format && (!reading.isAdult || ageConfirmed);
  const canStep1 = format === "async" || !!selectedDate;
  const canStep2 = !!intake.clientName?.trim() && !!intake.mainQuestion?.trim();
  const canConfirm = !!paymentMethod && paymentReference.trim().length > 0 && whatsapp.trim().length >= 10 && !!proofFile;

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
        paymentAmount: finalPrice, paymentReference: paymentReference.trim(),
        clientName: intake.clientName, intakeAnswers: intake,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Booking failed");
      setBookingId(json.data.id); setBookingDone(true);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Booking failed.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const STEPS = ["Format", "Schedule", "About You", "Payment"];

  if (bookingDone) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border" style={{ background: "#eef3ea", borderColor: `${GN}44` }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: GN }} />
        </div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: DARK }}>You're in the queue</h2>
        <p className="text-sm mb-1" style={{ color: "#9a8e7e" }}>{reading.name}</p>
        <p className="text-xs mb-5" style={{ color: "#b0a898" }}>Booking #{bookingId} · ${finalPrice} USD · Pending verification</p>
        <div className="rounded-lg border p-4 text-sm text-left space-y-2 mb-5 bg-white" style={{ borderColor: BORDER }}>
          <p style={{ color: "#5a5040" }}>✓ Ellie will verify your payment within ~24 hours.</p>
          <p style={{ color: "#5a5040" }}>✓ Your session link will be sent to WhatsApp: <strong>{whatsapp}</strong></p>
          <p className="text-xs" style={{ color: "#9a8e7e" }}>Nothing more to do — sit back and await your reading. 🌿</p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full text-white" style={{ background: GN }}>Back to Readings</Button>
      </div>
    </div>
  );

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b bg-white" style={{ borderColor: BORDER }}>
        <div className="max-w-xl mx-auto px-4 py-3">
          <button onClick={() => step === 0 ? navigate("/") : setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm mb-2 transition-colors" style={{ color: "#9a8e7e" }}>
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "All Readings" : "Back"}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-sm" style={{ color: DARK }}>{reading.name}</h1>
              <p className="text-xs" style={{ color: "#9a8e7e" }}>{CATEGORY_LABELS[reading.category]} · ${reading.price} base</p>
            </div>
            <div className="flex gap-1.5 items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: i < step ? GN : i === step ? GOLD : "#e8e4dc", color: i <= step ? "white" : "#9a8e7e" }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className="h-px w-3" style={{ background: i < step ? GN : "#e8e4dc" }} />}
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
            <h2 className="font-medium mb-1" style={{ color: DARK }}>Choose format</h2>
            <p className="text-sm mb-4" style={{ color: "#9a8e7e" }}>How would you like to receive this reading?</p>
            {reading.isAdult && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2.5 border" style={{ background: "#fff5f5", borderColor: "#fcc" }}>
                <Checkbox id="age" checked={ageConfirmed} onCheckedChange={v => setAgeConfirmed(!!v)} className="mt-0.5" />
                <label htmlFor="age" className="text-sm cursor-pointer" style={{ color: "#a03030" }}>I confirm I am 18 or older and consent to adult content.</label>
              </div>
            )}
            <div className="space-y-2 mb-5">
              {reading.formats.map(f => {
                const Icon = FORMAT_ICONS[f] || Send;
                const sel = format === f;
                return (
                  <button key={f} onClick={() => setFormat(f)}
                    className="w-full text-left rounded-lg border p-3 transition-all flex items-center gap-3"
                    style={{ borderColor: sel ? GN : BORDER, background: sel ? HERO : "white" }}>
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: sel ? GN : "#9a8e7e" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: DARK }}>{FORMAT_LABELS[f]}</p>
                      <p className="text-xs" style={{ color: "#9a8e7e" }}>
                        {f === "video" && "Live video session — scheduled"}
                        {f === "audio" && "Live audio call — scheduled"}
                        {f === "chat" && "Real-time text via WhatsApp"}
                        {f === "async" && "Written/recorded delivery within ~24h"}
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
            <h2 className="font-medium mb-1" style={{ color: DARK }}>
              {format === "async" ? "Choose questions" : "Duration & date"}
            </h2>
            <p className="text-sm mb-4" style={{ color: "#9a8e7e" }}>
              {format === "async" ? "How many questions would you like answered?" : "Pick a duration and choose a date and time (Harare/CAT)."}
            </p>
            {format === "async" ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {QUESTION_TIERS.map(t => (
                  <button key={t.value} onClick={() => setQuestionCount(t.value)}
                    className="rounded-lg border p-3 text-left transition-all"
                    style={{ borderColor: questionCount === t.value ? GN : BORDER, background: questionCount === t.value ? HERO : "white" }}>
                    <p className="text-sm font-medium" style={{ color: DARK }}>{t.label}</p>
                    <p className="text-xs" style={{ color: "#9a8e7e" }}>${reading.isFixed ? reading.price : Math.round(reading.price * t.multiplier)} USD</p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {!reading.isFixed && (
                  <div className="mb-4">
                    <Label className="text-xs mb-2 block" style={{ color: "#9a8e7e" }}>Session duration</Label>
                    <div className="flex gap-2">
                      {DURATION_TIERS.map(t => (
                        <button key={t.value} onClick={() => setDuration(t.value)}
                          className="flex-1 rounded-lg border py-2 text-center text-xs transition-all"
                          style={{ borderColor: duration === t.value ? GN : BORDER, background: duration === t.value ? HERO : "white", fontWeight: duration === t.value ? 600 : 400, color: DARK }}>
                          <div>{t.label}</div>
                          <div style={{ color: "#9a8e7e" }}>${Math.round(reading.price * t.multiplier)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <BookingCalendar selected={selectedDate} onSelect={setSelectedDate} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg p-3 mt-4 mb-5" style={{ background: HERO, border: `1px solid ${GN}33` }}>
              <span className="text-sm" style={{ color: "#5a5040" }}>Price for this booking</span>
              <span className="font-bold" style={{ color: GN }}>${finalPrice} USD</span>
            </div>
            <Button onClick={() => setStep(2)} disabled={!canStep1} className="w-full text-white" style={{ background: GN }}>Continue →</Button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 className="font-medium mb-1" style={{ color: DARK }}>About you</h2>
            <p className="text-sm mb-4" style={{ color: "#9a8e7e" }}>Strictly confidential — only seen by Ellie.</p>
            <div className="space-y-4 mb-5">
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Full name *</Label>
                <Input placeholder="Your full name" value={intake.clientName} onChange={e => setIntake(p => ({ ...p, clientName: e.target.value }))} className="bg-white" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Date of birth</Label>
                <Input type="date" value={intake.dob} onChange={e => setIntake(p => ({ ...p, dob: e.target.value }))} className="bg-white" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Main question or focus *</Label>
                <textarea className="w-full rounded-md border px-3 py-2 text-sm resize-none bg-white focus-visible:outline-none focus-visible:ring-1"
                  style={{ borderColor: BORDER }} rows={3}
                  placeholder="What guidance are you seeking?"
                  value={intake.mainQuestion} onChange={e => setIntake(p => ({ ...p, mainQuestion: e.target.value }))} />
              </div>
              {reading.customIntake?.map(field => (
                <div key={field.field}>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>{field.label}</Label>
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
            <h2 className="font-medium mb-1" style={{ color: DARK }}>Payment & confirm</h2>
            <div className="flex items-center justify-between rounded-lg p-3 mb-5" style={{ background: HERO, border: `1px solid ${GN}33` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: DARK }}>{reading.name}</p>
                <p className="text-xs" style={{ color: "#9a8e7e" }}>{format && FORMAT_LABELS[format]}{selectedDate ? ` · ${selectedDate.toLocaleDateString()}` : ""}</p>
              </div>
              <span className="font-bold" style={{ color: GN }}>${finalPrice} USD</span>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: "#9a8e7e" }}><CreditCard className="h-3.5 w-3.5" /> 1. Payment method</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                      className="w-full text-left rounded-lg border p-3 transition-all"
                      style={{ borderColor: paymentMethod === m.value ? GN : BORDER, background: paymentMethod === m.value ? HERO : "white" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: DARK }}>{m.label}</p>
                          <p className="text-xs" style={{ color: "#9a8e7e" }}>{m.desc}</p>
                        </div>
                        {paymentMethod === m.value && <CheckCircle2 className="h-4 w-4" style={{ color: GN }} />}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedMethod && (
                  <div className="mt-2 rounded-lg p-3 text-xs" style={{ background: "#fffbf0", border: `1px solid ${GOLD}44` }}>
                    <p className="font-medium mb-1" style={{ color: GOLD }}>Instructions:</p>
                    <p style={{ color: "#5a5040" }}>{selectedMethod.instructions}</p>
                  </div>
                )}
              </div>

              {selectedMethod && (
                <div>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: "#9a8e7e" }}><CreditCard className="h-3.5 w-3.5" /> 2. Payment reference number</p>
                  <Input placeholder="e.g. transaction / confirmation number" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className="bg-white font-mono" />
                  <p className="text-xs mt-1" style={{ color: "#b0a898" }}>Enter the reference shown in your payment confirmation so Ellie can match it.</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: "#9a8e7e" }}><Phone className="h-3.5 w-3.5" /> 3. Your WhatsApp number</p>
                <Input type="tel" placeholder="+263 7X XXX XXXX" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="bg-white" />
                <p className="text-xs mt-1" style={{ color: "#b0a898" }}>Session link and confirmation sent here after verification.</p>
              </div>

              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: "#9a8e7e" }}><FileImage className="h-3.5 w-3.5" /> 4. Upload proof of payment</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileChange} />
                {proofFile ? (
                  <div className="rounded-lg border p-3" style={{ borderColor: `${GN}66`, background: HERO }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm flex items-center gap-1.5" style={{ color: DARK }}><CheckCircle2 className="h-4 w-4 text-green-600" />{proofFile.name}</span>
                      <button className="text-xs hover:opacity-70" style={{ color: "#9a8e7e" }} onClick={() => { setProofFile(null); setProofPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button>
                    </div>
                    {proofPreview && <img src={proofPreview} alt="Proof" className="max-h-28 rounded border object-contain" style={{ borderColor: BORDER }} />}
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg border-2 border-dashed p-5 text-center transition-colors hover:border-[#4a7040]" style={{ borderColor: BORDER }}>
                    <Upload className="h-5 w-5 mx-auto mb-1.5" style={{ color: "#c0b8a8" }} />
                    <p className="text-sm" style={{ color: "#9a8e7e" }}>Upload screenshot or PDF receipt</p>
                    <p className="text-xs mt-0.5" style={{ color: "#c0b8a8" }}>JPG, PNG or PDF · max 5 MB</p>
                  </button>
                )}
              </div>

              <Button className="w-full text-white" disabled={!canConfirm || isSubmitting} onClick={handleConfirm} style={{ background: GN }}>
                {isSubmitting ? "Confirming…" : "Confirm Booking"}
              </Button>
              {!canConfirm && <p className="text-center text-xs" style={{ color: "#b0a898" }}>Complete all steps above to confirm.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
