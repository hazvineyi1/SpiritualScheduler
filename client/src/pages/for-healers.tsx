import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useVisitTracking } from "@/hooks/use-visit-tracking";
import {
  CheckCircle2, ArrowRight, Lock, ShieldCheck, MessageCircle, Mail, Play, Pause,
} from "lucide-react";

const BG      = "#f5efe0";
const HERO    = "#e6d7b3";
const BORDER  = "#c9b896";
const GN      = "#2d4a3a";
const DARK    = "#1c1712";
const GOLD    = "#a2532e";

const SUPPORT_EMAIL = "info@synops-consulting.com";
const STEP_MS = 4000;

// ---- The "video" walkthrough: five frames, alternating client and healer,
// auto-advancing like a short product demo.
const STEPS = [
  {
    actor: "Client", title: "Picks a time",
    body: "Only genuinely open slots show up — never a double-booking.",
    render: () => (
      <div className="bg-white rounded-xl border p-3" style={{ borderColor: BORDER }}>
        <p className="text-xs font-medium mb-2" style={{ color: DARK }}>Tuesday, 3 September</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "09:00", state: "booked" }, { label: "10:00", state: "open" },
            { label: "11:00", state: "open" }, { label: "12:00", state: "selected" },
            { label: "14:00", state: "booked" }, { label: "15:00", state: "open" },
          ].map((s, i) => (
            <div key={i} className="rounded-md py-1.5 text-center text-[11px] font-medium border"
              style={{
                borderColor: s.state === "selected" ? GN : BORDER,
                background: s.state === "selected" ? GN : s.state === "booked" ? "#f0ece4" : "white",
                color: s.state === "selected" ? "white" : s.state === "booked" ? "#b0a898" : DARK,
              }}>
              {s.label}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    actor: "Client", title: "Pays you directly",
    body: "Money moves client-to-healer, straight to your EcoCash or InnBucks. The platform never touches it.",
    render: () => (
      <div className="bg-white rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER }}>
        <div className="rounded-md border px-2.5 py-2 flex items-center justify-between" style={{ borderColor: GN, background: HERO }}>
          <span className="text-xs font-medium" style={{ color: DARK }}>EcoCash USD</span>
          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: GN }} />
        </div>
        <div className="rounded-md border px-2.5 py-2 text-xs" style={{ borderColor: BORDER, color: "#8a7d6b" }}>InnBucks</div>
        <div className="rounded-md border-2 border-dashed px-2.5 py-3 text-center" style={{ borderColor: BORDER }}>
          <p className="text-[11px] font-medium flex items-center justify-center gap-1" style={{ color: GN }}><CheckCircle2 className="h-3 w-3" /> Proof of payment attached</p>
        </div>
      </div>
    ),
  },
  {
    actor: "Healer", title: "It lands in your queue",
    body: "Every pending payment waits in one organized list — never buried in a chat thread.",
    render: () => (
      <div className="bg-white rounded-xl border p-3" style={{ borderColor: BORDER }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold" style={{ color: DARK }}>Payments to verify</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ background: GOLD }}>1</span>
        </div>
        <div className="rounded-md border px-2.5 py-2" style={{ borderColor: BORDER, background: HERO }}>
          <p className="text-[11px] font-semibold" style={{ color: DARK }}>Ancestral Cleansing</p>
          <p className="text-[10px]" style={{ color: "#8a7d6b" }}>Rutendo C. · $30 · ecocash</p>
        </div>
      </div>
    ),
  },
  {
    actor: "Healer", title: "One tap to verify",
    body: "Confirm the payment and the booking locks straight into your schedule.",
    render: () => (
      <div className="bg-white rounded-xl border p-3" style={{ borderColor: BORDER }}>
        <div className="rounded-md border px-2.5 py-2 mb-2" style={{ borderColor: BORDER, background: HERO }}>
          <p className="text-[11px] font-semibold" style={{ color: DARK }}>Ancestral Cleansing</p>
          <p className="text-[10px]" style={{ color: "#8a7d6b" }}>Rutendo C. · $30 · ecocash</p>
        </div>
        <div className="text-white rounded-md py-1.5 text-center text-[11px] font-medium flex items-center justify-center gap-1.5" style={{ background: GN }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Verify
        </div>
      </div>
    ),
  },
  {
    actor: "Both", title: "Session confirmed",
    body: "A WhatsApp message goes out automatically — nothing left for either of you to type.",
    render: () => (
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: HERO }}>
          <span className="text-xs font-semibold" style={{ color: DARK }}>Today's bookings</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: GN }}>1 confirmed</span>
        </div>
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: DARK }}>Rutendo C.</p>
            <p className="text-[11px]" style={{ color: "#8a7d6b" }}>Ancestral Cleansing · 2:00 PM</p>
          </div>
          <span className="text-[10px] flex items-center gap-1 font-medium" style={{ color: GN }}>
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        </div>
      </div>
    ),
  },
];

function ProcessDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep(s => (s + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, [playing, step]);

  const current = STEPS[step];

  return (
    <div className="max-w-2xl mx-auto">
      <style>{`
        @keyframes demoProgressFill { from { width: 0%; } to { width: 100%; } }
        .demo-progress-fill { animation: demoProgressFill ${STEP_MS}ms linear; }
      `}</style>

      <div className="grid md:grid-cols-2 gap-5 items-center bg-white rounded-2xl border p-4 sm:p-5" style={{ borderColor: BORDER }}>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: current.actor === "Healer" ? HERO : "#fbf3ee", color: current.actor === "Healer" ? GN : "#a24a2e" }}>
            {current.actor === "Both" ? "Client + Healer" : current.actor}
          </span>
          <h3 className="text-base font-semibold mt-2 mb-1" style={{ color: DARK }}>{current.title}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "#6b5f4a" }}>{current.body}</p>
        </div>
        <div key={step}>{current.render()}</div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => setPlaying(p => !p)}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border"
          style={{ borderColor: BORDER, color: GN }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
        </button>
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setStep(i); setPlaying(false); }}
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: "#e2ddd0" }}
            aria-label={`Go to step ${i + 1}`}
          >
            <div
              className={i === step && playing ? "demo-progress-fill h-full rounded-full" : "h-full rounded-full"}
              style={{ background: GN, width: i < step ? "100%" : i === step && !playing ? "100%" : i === step ? undefined : "0%" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ForHealers() {
  useVisitTracking("/for-healers");
  const [form, setForm] = useState({ name: "", contact: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleInterestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/leads", form);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Something went wrong");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: BG, color: DARK }}>
      {/* SEPTEMBER PROMO BANNER */}
      <div className="text-center text-xs sm:text-sm font-medium py-2 px-4 text-white" style={{ background: GOLD }}>
        🎁 Sign up in September — your first 3 months are free.
      </div>

      {/* NAV */}
      <nav className="border-b sticky top-0 z-40 bg-white/90 backdrop-blur" style={{ borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/"><span className="font-semibold text-sm cursor-pointer" style={{ color: DARK }}>African Spiritual Hub</span></Link>
          <Link href="/signup">
            <Button size="sm" className="h-8 text-xs text-white" style={{ background: GN }}>List Your Practice — Free</Button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
        <h1 className="text-2xl sm:text-4xl font-semibold leading-tight mb-3" style={{ color: DARK }}>
          Your gift deserves more than a flooded WhatsApp inbox.
        </h1>
        <p className="text-sm sm:text-base max-w-lg mx-auto mb-6" style={{ color: "#6b5f4a" }}>
          One hub for bookings, schedule, and payments. Every client accounted for — WhatsApp back to just being a chat app.
        </p>
        <Link href="/signup">
          <Button className="h-11 px-6 text-white text-sm" style={{ background: GN }}>Create your free hub <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
        </Link>
        <p className="text-xs mt-3" style={{ color: GOLD, fontWeight: 600 }}>Sign up in September for 3 months free.</p>
      </section>

      {/* THE "VIDEO" — auto-playing walkthrough, client side then healer side */}
      <section className="max-w-5xl mx-auto px-4 pb-10">
        <h2 className="text-lg sm:text-xl font-semibold text-center mb-1" style={{ color: DARK }}>Watch the whole loop</h2>
        <p className="text-xs text-center max-w-md mx-auto mb-5" style={{ color: "#6b5f4a" }}>
          From the client's first tap to the confirmation in your hand.
        </p>
        <ProcessDemo />
      </section>

      {/* COMPACT TRUST ROW */}
      <div className="max-w-3xl mx-auto px-4 pb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="text-xs flex items-center gap-1.5" style={{ color: "#6b5f4a" }}><Lock className="h-3.5 w-3.5" style={{ color: GN }} /> Independent &amp; private</span>
        <span className="text-xs flex items-center gap-1.5" style={{ color: "#6b5f4a" }}><ShieldCheck className="h-3.5 w-3.5" style={{ color: GN }} /> ZINATHA verification available</span>
        <span className="text-xs flex items-center gap-1.5" style={{ color: "#6b5f4a" }}><MessageCircle className="h-3.5 w-3.5" style={{ color: GN }} /> WhatsApp stays central</span>
      </div>

      {/* CTA + INTEREST FORM, combined */}
      <section className="py-12 px-4" style={{ background: GN }}>
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Give your practice room to breathe.</h2>
          <p className="text-xs mb-5" style={{ color: "#c9d6cc" }}>No commitment. Payments go straight to you, always. 3 months free if you sign up in September.</p>
          <Link href="/signup">
            <Button className="h-11 px-8 text-sm w-full sm:w-auto" style={{ background: "white", color: GN }}>Create Your Free Hub</Button>
          </Link>

          <div className="mt-8 pt-8 border-t border-white/20">
            {submitted ? (
              <p className="text-sm text-white/90">Thank you — you're on our list. We'll reach out soon.</p>
            ) : (
              <>
                <p className="text-xs text-white/80 mb-3">Not ready yet? Leave your details and we'll reach out — no hub created until you are.</p>
                <form onSubmit={handleInterestSubmit} className="flex flex-col sm:flex-row gap-2">
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" required className="bg-white" />
                  <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="WhatsApp or email" required className="bg-white" />
                  <Button type="submit" className="text-white flex-shrink-0" style={{ background: GOLD }} disabled={submitting}>
                    {submitting ? "…" : "I'm Interested"}
                  </Button>
                </form>
                {error && <p className="text-xs mt-2 text-red-200">{error}</p>}
              </>
            )}
            <p className="text-xs mt-4" style={{ color: "#c9d6cc" }}>
              Prefer email? Reach us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("I'm interested in African Spiritual Hub")}`}
                className="underline inline-flex items-center gap-1 text-white">
                <Mail className="h-3 w-3" /> {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>

      <footer className="text-center text-xs py-5 border-t" style={{ borderColor: BORDER, color: "#8a7d63" }}>
        <span style={{ color: GN }}>African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
