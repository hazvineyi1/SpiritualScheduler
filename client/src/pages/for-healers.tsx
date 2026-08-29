import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageCircle, CalendarCheck, ShieldCheck, Wallet, Clock,
  CheckCircle2, XCircle, ArrowRight, Lock, Gift,
} from "lucide-react";

const BG      = "#f5efe0";
const HERO    = "#e6d7b3";
const BORDER  = "#c9b896";
const GN      = "#2d4a3a";
const DARK    = "#1c1712";
const GOLD    = "#a2532e";

export default function ForHealers() {
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
        🎁 Sign up in September and get your first 3 months completely free.
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
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "#6b5f4a" }}>
          One private hub for your bookings, your schedule, and your payments — so every client is accounted for,
          and WhatsApp goes back to being just a chat app.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup">
            <Button className="h-11 px-6 text-white text-sm" style={{ background: GN }}>Create your free hub <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="h-11 px-6 text-sm" style={{ borderColor: BORDER, color: DARK }}>See a hub in action</Button>
          </Link>
        </div>
        <p className="text-xs mt-4" style={{ color: "#9a8e7e" }}>No setup fees. Your hub, your prices, your schedule. <span style={{ color: GOLD, fontWeight: 600 }}>Sign up in September for 3 months free.</span></p>
      </section>

      {/* CHAOS vs CALM — the signature contrast */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Chaos side */}
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

          {/* Calm side */}
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
              <CheckCircle2 className="h-3.5 w-3.5" /> Every booking verified, scheduled, and in one place — before it ever reaches your phone.
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS → FEATURES */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-2" style={{ color: DARK }}>Built around what actually slows you down</h2>
        <p className="text-sm text-center max-w-xl mx-auto mb-10" style={{ color: "#6b5f4a" }}>
          Not another app to check constantly — a quiet system working behind your WhatsApp, not instead of it.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              icon: Clock, title: "Full control of your schedule",
              body: "Set which days you work and your hours, close off a slot when you need rest, and clients can only book what you've actually opened up. No more juggling times in your head.",
            },
            {
              icon: CalendarCheck, title: "Never miss a client again",
              body: "Every booking lands in one organized queue, sorted by what needs your attention first. Nothing gets buried in a chat thread from three days ago.",
            },
            {
              icon: Wallet, title: "Payment before the back-and-forth",
              body: "Clients pay and upload proof before you ever exchange a message. You just verify it with one tap and the session locks into your schedule automatically.",
            },
            {
              icon: MessageCircle, title: "WhatsApp, without the flood",
              body: "You still connect with clients over WhatsApp — but only when there's something real to say: a session starting, a confirmed booking. The small talk and chasing disappear.",
            },
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

      {/* HOW IT WORKS */}
      <section className="pb-16" style={{ background: HERO }}>
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-10" style={{ color: DARK }}>Set up once. It runs itself from there.</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { title: "Create your hub", body: "Your name, your readings, your prices. Takes a few minutes, and comes with a starter catalog you can edit anytime." },
              { title: "Set your schedule", body: "Choose your working days and hours. Close a slot whenever you need to — clients only ever see what's genuinely open." },
              { title: "Clients book directly", body: "They find you, pay, and book a time that works for both of you. You focus on the reading, not the admin around it." },
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
            <p className="text-xs" style={{ color: "#6b5f4a" }}>Your hub is entirely your own — never shared with or visible to other practitioners.</p>
          </div>
          <div>
            <ShieldCheck className="h-5 w-5 mx-auto mb-2" style={{ color: GN }} />
            <p className="text-sm font-semibold mb-1" style={{ color: DARK }}>Verification available</p>
            <p className="text-xs" style={{ color: "#6b5f4a" }}>Add a ZINATHA-verified badge to your hub so clients know your practice is recognized.</p>
          </div>
          <div>
            <MessageCircle className="h-5 w-5 mx-auto mb-2" style={{ color: GN }} />
            <p className="text-sm font-semibold mb-1" style={{ color: DARK }}>WhatsApp stays central</p>
            <p className="text-xs" style={{ color: "#6b5f4a" }}>No new app for clients to learn — bookings still end in the conversation you already know.</p>
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
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center py-16 px-4" style={{ background: GN }}>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Give your practice room to breathe.</h2>
        <p className="text-sm mb-7" style={{ color: "#c9d6cc" }}>Free to list. Set up in minutes. Sign up in September and your first 3 months are free.</p>
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
