import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

const GN     = "#b8962e";
const DARK   = "#111111";
const BORDER = "#e2e0da";
const HERO   = "#f7f6f2";
const WA_LINK = "https://wa.me/263771234567";

type Msg = { from: "bot" | "user"; text: string };

const FAQS: Array<{ q: string; a: string }> = [
  { q: "How do I book a reading?", a: "Browse the categories on the homepage, pick a reading that fits what you need, and tap \"Book.\" You'll upload proof of payment, then choose an available time slot — no account needed." },
  { q: "What payment methods do you accept?", a: "EcoCash, InnBucks, Remitly, and World Remit are all accepted. Exact payment details are shown during checkout." },
  { q: "Is my session private?", a: "Yes. Every session is confidential and never recorded. VaShava speaks English and Shona." },
  { q: "How long does a reading take?", a: "Most readings run 30–60 minutes depending on the format you choose — video, audio, chat, or written." },
  { q: "Can I reschedule or cancel?", a: "Message VaShava directly on WhatsApp as soon as you can, and she'll help sort out a new time." },
  { q: "Do you offer in-person sessions?", a: "Yes — in-person consultations are available in Harare. The exact address is shared privately over WhatsApp once your booking is confirmed." },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "👋 Hi, I'm VaShava's assistant. Pick a question below, or message VaShava directly on WhatsApp for anything else." },
  ]);
  const [askedIds, setAskedIds] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const askFaq = (i: number) => {
    const faq = FAQS[i];
    setMessages(prev => [...prev, { from: "user", text: faq.q }, { from: "bot", text: faq.a }]);
    setAskedIds(prev => new Set(prev).add(i));
  };

  const resetChat = () => {
    setMessages([{ from: "bot", text: "👋 Hi, I'm VaShava's assistant. Pick a question below, or message VaShava directly on WhatsApp for anything else." }]);
    setAskedIds(new Set());
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: GN }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl shadow-2xl border overflow-hidden bg-white flex flex-col"
          style={{ borderColor: BORDER, maxHeight: "min(28rem, 70vh)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: HERO, borderColor: BORDER }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: DARK }}>✦ VaShava's Assistant</p>
              <p className="text-[11px]" style={{ color: "#9a8e7e" }}>Quick answers to common questions</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4" style={{ color: "#9a8e7e" }} />
            </button>
          </div>

          {/* Scrollable content: messages + quick questions, so the footer below always stays visible */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="rounded-lg px-3 py-2 text-xs max-w-[85%] leading-relaxed"
                  style={m.from === "user"
                    ? { background: GN, color: "#fff" }
                    : { background: HERO, color: DARK, border: `1px solid ${BORDER}` }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Quick questions */}
            <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              {FAQS.map((f, i) => (
                <button
                  key={i}
                  onClick={() => askFaq(i)}
                  disabled={askedIds.has(i)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-default hover:bg-[#f5f1eb]"
                  style={{ borderColor: BORDER, color: DARK }}
                >
                  {f.q}
                </button>
              ))}
              {askedIds.size === FAQS.length && (
                <button
                  onClick={resetChat}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-colors hover:bg-[#f5f1eb]"
                  style={{ borderColor: BORDER, color: "#9a8e7e" }}
                >
                  ↺ Start over
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp fallback — always pinned at the bottom */}
          <a
            href={`${WA_LINK}?text=${encodeURIComponent("Hi VaShava! I have a question.")}`}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 text-white"
            style={{ background: GN }}
          >
            <Send className="h-3.5 w-3.5" /> Message VaShava on WhatsApp
          </a>
        </div>
      )}
    </>
  );
}
