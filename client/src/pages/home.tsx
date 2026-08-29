import { useState, useMemo } from "react";
import { Link } from "wouter";
import { READINGS, CATEGORY_LABELS } from "@shared/types";
import type { ReadingCategory } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Shield, MessageCircle, Search, ChevronDown, ChevronRight } from "lucide-react";

const CAT_ICON: Record<string, string> = {
  love_relationships: "💕",
  ancestors_spirit: "🌿",
  healing_wellbeing: "✨",
  spells_protection: "🔮",
  guidance_future: "🌟",
  live_in_person: "🎴",
};

const ALL_CATS = Object.keys(CATEGORY_LABELS) as ReadingCategory[];
const ELLIE_WA = "https://wa.me/263771234567";

const BG     = "#ffffff";
const HERO   = "#f7f6f2";
const BORDER = "#e2e0da";
const GN     = "#b8962e";
const DARK   = "#111111";
const GOLD   = "#8a6a2a";

export default function Home() {
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<ReadingCategory>>(new Set<ReadingCategory>(["love_relationships"]));

  const toggleCat = (c: ReadingCategory) =>
    setOpenCats(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  // When searching, show all categories with matches expanded
  const searchQ = search.toLowerCase().trim();
  const readingsBycat = useMemo(() => {
    const map: Record<ReadingCategory, typeof READINGS> = {} as any;
    ALL_CATS.forEach(c => { map[c] = READINGS.filter(r => r.category === c && (!searchQ || r.name.toLowerCase().includes(searchQ))); });
    return map;
  }, [searchQ]);

  return (
    <div style={{ background: BG, color: DARK, minHeight: "100vh" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: HERO, borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm" style={{ color: DARK }}>✦ VaShava</span>
          <div className="flex items-center gap-2">
            <a href={ELLIE_WA} target="_blank" rel="noreferrer">
              <Button size="sm" className="h-7 text-xs gap-1.5 text-white" style={{ background: GN }}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            </a>
            <Link href="/dashboard">
              <Button size="sm" variant="ghost" className="h-7 text-xs" style={{ color: "#6a5f50" }}>Healer Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: HERO, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/images/vashava-avatar.jpg"
                alt="VaShava"
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                style={{ border: `2px solid ${GOLD}66` }}
              />
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border mb-1" style={{ borderColor: `${GOLD}66`, color: GOLD }}>
                  <Shield className="h-3 w-3" /> ZINATHA Verified
                </div>
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: DARK }}>VaShava</h1>
              </div>
            </div>
            <p className="text-xs italic mb-2" style={{ color: GOLD }}>"Where Ancient Wisdom Meets Modern Healing"</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-3" style={{ color: "#7a6e5e" }}>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Harare, Zimbabwe · worldwide</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~24h response</span>
            </div>
            <a href={`${ELLIE_WA}?text=${encodeURIComponent("Hi VaShava! I have a question.")}`} target="_blank" rel="noreferrer">
              <Button className="h-8 text-sm gap-1.5 text-white" style={{ background: GN }}>
                <MessageCircle className="h-4 w-4" /> Message VaShava
              </Button>
            </a>
          </div>
          <div className="sm:w-52 flex flex-col gap-3">
            <div className="rounded-lg p-3 text-xs bg-white" style={{ border: `1px solid ${BORDER}` }}>
              <p className="font-medium mb-0.5" style={{ color: GN }}>🔒 Your privacy matters</p>
              <p style={{ color: "#7a6e5e" }}>Sessions are private and never recorded. English & Shona spoken.</p>
            </div>
            <img
              src="/images/eland.jpg"
              alt="Kunatira / Kurutsiswa — traditional cleansing"
              className="w-full rounded-lg object-cover"
              style={{ border: `1px solid ${BORDER}`, maxHeight: 260 }}
            />
          </div>
        </div>
      </section>

      {/* CONTENT — readings only */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <Input placeholder="Search readings…" className="pl-9 h-8 text-sm bg-white" style={{ borderColor: BORDER }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Category accordion */}
        <div className="rounded-lg overflow-hidden border bg-white" style={{ borderColor: BORDER }}>
          {ALL_CATS.map((cat, ci) => {
            const rows = readingsBycat[cat];
            if (searchQ && rows.length === 0) return null;
            const isOpen = openCats.has(cat) || (searchQ.length > 0 && rows.length > 0);
            return (
              <div key={cat} style={{ borderTop: ci > 0 ? `1px solid ${BORDER}` : undefined }}>
                {/* Category header */}
                <button onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#f5f1eb]"
                  style={{ background: isOpen ? HERO : "white" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{CAT_ICON[cat]}</span>
                    <span className="text-sm font-medium" style={{ color: DARK }}>{CATEGORY_LABELS[cat]}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f0ece4", color: "#7a6e5e" }}>{rows.length}</span>
                  </div>
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: GN }} />
                    : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "#b0a898" }} />}
                </button>

                {/* Reading rows */}
                {isOpen && rows.map((r) => (
                  <div key={r.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#faf7f2] transition-colors"
                    style={{ borderTop: `1px solid #f0ece4`, paddingLeft: 52 }}>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="text-sm truncate" style={{ color: DARK }}>{r.name}</span>
                      {r.isAdult && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded flex-shrink-0">18+</span>}
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-sm font-semibold" style={{ color: GN }}>${r.price}</span>
                      <Link href={`/book/${r.id}`}>
                        <Button size="sm" className="h-7 text-xs px-3 text-white" style={{ background: GN }}>Book</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "#b0a898" }}>41 readings across 6 traditions · tap a category to browse</p>
      </div>

      <footer className="text-center text-xs py-5 mt-4 border-t" style={{ borderColor: BORDER, color: "#9a8e7e" }}>
        <span style={{ color: GN }}>✦ VaShava</span> · Harare, Zimbabwe · Worldwide
      </footer>
    </div>
  );
}
