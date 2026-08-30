import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useVisitTracking } from "@/hooks/use-visit-tracking";
import {
  MessageCircle, CalendarCheck, ShieldCheck, Wallet, Clock,
  CheckCircle2, XCircle, ArrowRight, Lock, Gift, Mail, Play, Pause,
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
// auto-advancing like a short product demo, with a Stories-style progress
// bar per frame and manual dot controls that pause autoplay.
const STEPS = [
  {
    actor: "Client", title: "Picks a time",
    body: "Only genuinely open slots ever show up — never a double-booking.",
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
    body: "Money moves client-to-healer, straight to your own EcoCash or InnBucks. The platform never touches it.",
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
    body: "A WhatsApp message goes out automatically to confirm — nothing left for either of you to type.",
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

      <div className="grid md:grid-cols-2 gap-6 items-center bg-white rounded-2xl border p-5 sm:p-6" style={{ borderColor: BORDER }}>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: current.actor === "Healer" ? HERO : "#fbf3ee", color: current.actor === "Healer" ? GN : "#a24a2e" }}>
            {current.actor === "Both" ? "Client + Healer" : current.actor}
          </span>
          <h3 className="text-lg font-semibold mt-2 mb-1.5" style={{ color: DARK }}>{current.title}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "#6b5f4a" }}>{current.body}</p>
        </div>
        <div key={step}>{current.render()}</div>
      </div>

      {/* Progress bar controls — click a dot to jump there and pause autoplay */}
      <div className="flex items-center gap-2 mt-4">
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
  const [form, setForm] = useState({ name: "", contact: "", country: "", message: "" });
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
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: GOLD }}>For traditional healers &amp; spiritual practitioners</p>
        <h1 className="text-3xl sm:text-5xl font-semibold leading-tight mb-5" style={{ color: DARK }}>
          Your gift deserves more<br className="hidden sm:block" /> than a flooded WhatsApp inbox.
        </h1>
        <p className="text-base sm:text-lg max-w-xl mx-auto mb-8" style={{ color: "#6b5f4a" }}>
          One hub for bookings, schedule, and payments — every client accounted for, WhatsApp back to just being a chat app.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup">
            <Button className="h-11 px-6 text-white text-sm" style={{ background: GN }}>Create your free hub <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="h-11 px-6 text-sm" style={{ borderColor: BORDER, color: DARK }}>See a hub in action</Button>
          </Link>
        </div>
        <p className="text-xs mt-4" style={{ color: "#9a8e7e" }}>No setup fees. <span style={{ color: GOLD, fontWeight: 600 }}>Sign up in September for 3 months free.</span></p>
      </section>

      {/* CHAOS vs CALM — the signature contrast */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border-2 border-dashed p-5" style={{ borderColor: "#c9a08a", background: "#fbf3ee" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#a24a2e" }}>Right now, probably</p>
            <div className="space-y-2">
              {[
                "Hey are you free today?? 🙏",
                "Did you get my EcoCash?",
                "Following up on my reading from last week",
                "Hi is 3pm still open",
                "Sent payment, please confirm 🙏🙏",
                "Hello???",
              ].map((msg, i) => (
                <div key={i} className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs shadow-sm max-w-[85%]" style={{ color: "#5c4a3a" }}>
                  {msg}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-medium" style={{ color: "#a24a2e" }}>
              <XCircle className="h-3.5 w-3.5" /> Easy to lose track. Easy to double-book. Easy to burn out.
            </div>
          </div>

          <div className="rounded-2xl border p-5 bg-white" style={{ borderColor: BORDER }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: GN }}>With your own hub</p>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="px-3 py-2 flex items-center justify-between" style={{ background: HERO }}>
                <span className="text-xs font-semibold" style={{ color: DARK }}>Today's bookings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: GN }}>3 confirmed</span>
              </div>
              <div className="divide-y" style={{ borderColor: BORDER }}>
                {[
                  { name: "Rutendo C.", svc: "Ancestral Cleansing", time: "2:00 PM", status: "Paid" },
                  { name: "Farai N.", svc: "Yes/No Reading", time: "Async", status: "Paid" },
                  { name: "Tendai M.", svc: "Consultation", time: "Async", status: "Paid" },
                ].map((b, i) => (
                  <div key={i} className="px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium" style={{ color: DARK }}>{b.name}</p>
                      <p className="text-[11px]" style={{ color: "#8a7d6b" }}>{b.svc} · {b.time}</p>
                    </div>
                    <span className="text-[10px] flex items-center gap-1 font-medium" style={{ color: GN }}>
                      <CheckCircle2 className="h-3 w-3" /> {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-medium" style={{ color: GN }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Every booking verified and scheduled before it reaches your phone.
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS → FEATURES */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-2" style={{ color: DARK }}>Built around what slows you down</h2>
        <p className="text-sm text-center max-w-xl mx-auto mb-10" style={{ color: "#6b5f4a" }}>
          A quiet system working behind your WhatsApp, not instead of it.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            { icon: Clock, title: "Full control of your schedule", body: "Set your days and hours. Clients only ever see what you've actually opened up." },
            { icon: CalendarCheck, title: "Never miss a client", body: "Every booking lands in one organized queue — nothing buried in old chats." },
            { icon: Wallet, title: "Payment before the back-and-forth", body: "Clients pay and attach proof first. One tap verifies it and locks in the session." },
            { icon: MessageCircle, title: "WhatsApp, without the flood", body: "You still connect over WhatsApp — just for what matters, not the small talk." },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-xl border p-5" style={{ borderColor: BORDER }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: HERO }}>
                <f.icon className="h-4.5 w-4.5" style={{ color: GN }} />
              </div>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: DARK }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#6b5f4a" }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* THE "VIDEO" — auto-playing walkthrough, client side then healer side */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-2" style={{ color: DARK }}>Watch the whole loop</h2>
        <p className="text-sm text-center max-w-xl mx-auto mb-10" style={{ color: "#6b5f4a" }}>
          From the client's first tap to the confirmation in your hand — no app to download, nothing for either of you to type.
        </p>
        <ProcessDemo />
      </section>

      {/* HOW IT WORKS */}
      <section className="pb-16" style={{ background: HERO }}>
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-10" style={{ color: DARK }}>Set up once. It runs itself.</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { title: "Create your hub", body: "Your name, readings, and prices — with a starter catalog you can edit anytime." },
              { title: "Set your schedule", body: "Choose your working days and hours. Close a slot whenever you need to." },
              { title: "Clients book directly", body: "They find you, pay, and book. You focus on the reading, not the admin." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-semibold text-sm" style={{ background: GN }}>
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: DARK }}>{s.title}</h3>
                <p className="text-xs leading-relaxed max-w-[220px] mx-auto" style={{ color: "#6b5f4a" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <Lock className="h-5 w-5 mx-auto mb-2" style={{ color: GN }} />
            <p className="text-sm font-semibold mb-1" style={{ color: DARK }}>Independent &amp; private</p>
            <p className="text-xs" style={{ color: "#6b5f4a" }}>Your hub is entirely your own — never shared with other practitioners.</p>
          </div>
          <div>
            <ShieldCheck className="h-5 w-5 mx-auto mb-2" style={{ color: GN }} />
            <p className="text-sm font-semibold mb-1" style={{ color: DARK }}>Verification available</p>
            <p className="text-xs" style={{ color: "#6b5f4a" }}>Add a ZINATHA-verified badge so clients know you're recognized.</p>
          </div>
          <div>
            <MessageCircle className="h-5 w-5 mx-auto mb-2" style={{ color: GN }} />
            <p className="text-sm font-semibold mb-1" style={{ color: DARK }}>WhatsApp stays central</p>
            <p className="text-xs" style={{ color: "#6b5f4a" }}>No new app for clients — bookings end in the chat they already know.</p>
          </div>
        </div>
      </section>

      {/* INTEREST FORM */}
      <section className="max-w-lg mx-auto px-4 pb-16">
        <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: BORDER }}>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3" style={{ color: GN }} />
              <h3 className="text-lg font-semibold mb-1.5" style={{ color: DARK }}>Thank you — you're on our list.</h3>
              <p className="text-sm" style={{ color: "#6b5f4a" }}>We'll reach out with details soon. In the meantime, you're welcome to <Link href="/signup"><span className="underline cursor-pointer" style={{ color: GN }}>create your free hub</span></Link> right away.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4" style={{ color: GOLD }} />
                <h2 className="text-lg font-semibold" style={{ color: DARK }}>Not ready yet? Just tell us you're interested.</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: "#6b5f4a" }}>
                Leave your details and we'll reach out — no commitment, and no hub is created until you're ready.
              </p>
              <form onSubmit={handleInterestSubmit} className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Your name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mbuya Nyasha" required />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>WhatsApp number or email</Label>
                  <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="263771234567 or you@example.com" required />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Country (optional)</Label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Zimbabwe" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{ color: "#9a8e7e" }}>Anything you'd like us to know? (optional)</Label>
                  <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="e.g. what you practice, questions you have" rows={3} />
                </div>
                {error && <p className="text-xs" style={{ color: "#b05050" }}>{error}</p>}
                <Button type="submit" className="w-full text-white" style={{ background: GN }} disabled={submitting}>
                  {submitting ? "Sending…" : "I'm Interested"}
                </Button>
              </form>
            </>
          )}
          <p className="text-xs text-center mt-4" style={{ color: "#9a8e7e" }}>
            Prefer email? Reach us directly at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("I'm interested in African Spiritual Hub")}`}
              className="underline inline-flex items-center gap-1" style={{ color: GN }}>
              <Mail className="h-3 w-3" /> {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center py-16 px-4" style={{ background: GN }}>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Give your practice room to breathe.</h2>
        <p className="text-sm mb-6" style={{ color: "#c9d6cc" }}>Sign up in September and your first 3 months are free.</p>
        <div className="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap mb-8 max-w-lg mx-auto">
          {[
            "No commitment, cancel anytime",
            "Client details stay private to your hub",
            "Just organized scheduling",
            "Payments go straight to you, always",
          ].map((t, i) => (
            <span key={i} className="text-xs flex items-center gap-1.5 text-white/90">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#e6d7b3" }} /> {t}
            </span>
          ))}
        </div>
        <Link href="/signup">
          <Button className="h-11 px-8 text-sm" style={{ background: "white", color: GN }}>Create Your Free Hub</Button>
        </Link>
      </section>

      <footer className="text-center text-xs py-6 border-t" style={{ borderColor: BORDER, color: "#8a7d63" }}>
        <span style={{ color: GN }}>African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
