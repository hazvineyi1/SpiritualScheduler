import { useState, useMemo } from "react";
import { Link } from "wouter";
import { READINGS, PRODUCTS, SEEDED_REVIEWS, CATEGORY_LABELS, FORMAT_LABELS } from "@shared/types";
import type { ReadingCategory } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, MapPin, Clock, Shield, MessageCircle, Search, Plus, Minus, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";

interface CartItem { id: number; name: string; price: number; qty: number; }

const CAT_ICON: Record<string, string> = {
  love_relationships: "💕",
  ancestors_spirit: "🌿",
  healing_wellbeing: "✨",
  spells_protection: "🔮",
  guidance_future: "🌟",
  live_in_person: "🎴",
};

const ALL_CATS = Object.keys(CATEGORY_LABELS) as ReadingCategory[];
const PROD_CATS = ["incense", "crystals", "jewellery", "oils"] as const;
const ELLIE_WA = "https://wa.me/263771234567";

const BG     = "#fafaf7";
const HERO   = "#eef3ea";
const BORDER = "#ddd8ce";
const GN     = "#4a7040";
const DARK   = "#263320";
const GOLD   = "#8a6a2a";

export default function Home() {
  const [tab, setTab] = useState<"readings" | "shop" | "reviews">("readings");
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<ReadingCategory>>(new Set(["love_relationships"]));
  const [prodCat, setProdCat] = useState<typeof PROD_CATS[number] | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  const toggleCat = (c: ReadingCategory) =>
    setOpenCats(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  // When searching, show all categories with matches expanded
  const searchQ = search.toLowerCase().trim();
  const readingsBycat = useMemo(() => {
    const map: Record<ReadingCategory, typeof READINGS> = {} as any;
    ALL_CATS.forEach(c => { map[c] = READINGS.filter(r => r.category === c && (!searchQ || r.name.toLowerCase().includes(searchQ))); });
    return map;
  }, [searchQ]);

  const filteredProds = useMemo(() => PRODUCTS.filter(p => prodCat === "all" || p.category === prodCat), [prodCat]);

  const addToCart = (p: typeof PRODUCTS[0]) =>
    setCart(prev => prev.find(i => i.id === p.id)
      ? prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      : [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }]);

  const updateQty = (id: number, delta: number) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const checkout = () => {
    const lines = cart.map(i => `• ${i.name} ×${i.qty} = $${(i.price * i.qty).toFixed(2)}`).join("\n");
    window.open(`${ELLIE_WA}?text=${encodeURIComponent(`Hi Ellie! Order:\n\n${lines}\n\nTotal: $${cartTotal.toFixed(2)} USD 🌿`)}`, "_blank");
  };

  const avgRating = (SEEDED_REVIEWS.reduce((s, r) => s + r.rating, 0) / SEEDED_REVIEWS.length).toFixed(1);
  const pill = (active: boolean) => ({ background: active ? GN : "#f0ece4", color: active ? "white" : "#6a5f50" });

  return (
    <div style={{ background: BG, color: DARK, minHeight: "100vh" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: HERO, borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm" style={{ color: DARK }}>✦ Elliestrator Botanica</span>
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

      {/* HERO — compact */}
      <section style={{ background: HERO, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border mb-2" style={{ borderColor: `${GOLD}66`, color: GOLD }}>
              <Shield className="h-3 w-3" /> ZINATHA Verified
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-0.5" style={{ color: DARK }}>Elliestrator Botanica</h1>
            <p className="text-xs italic mb-2" style={{ color: GOLD }}>"Where Ancient Wisdom Meets Modern Healing"</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-2" style={{ color: "#7a6e5e" }}>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Harare, Zimbabwe · worldwide</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~24h response</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-[#c9a96e] text-[#c9a96e]" />)}
              <span className="text-sm font-semibold" style={{ color: DARK }}>4.9</span>
              <span className="text-xs" style={{ color: "#9a8e7e" }}>(161)</span>
            </div>
            <a href={`${ELLIE_WA}?text=${encodeURIComponent("Hi Ellie! I have a question.")}`} target="_blank" rel="noreferrer">
              <Button className="h-8 text-sm gap-1.5 text-white" style={{ background: GN }}>
                <MessageCircle className="h-4 w-4" /> Message Ellie
              </Button>
            </a>
          </div>
          <div className="sm:w-52 rounded-lg p-3 text-xs bg-white" style={{ border: `1px solid ${BORDER}` }}>
            <p className="font-medium mb-0.5" style={{ color: GN }}>🔒 Your privacy matters</p>
            <p style={{ color: "#7a6e5e" }}>Sessions are private and never recorded. English & Shona spoken.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t" style={{ borderColor: BORDER }}>
          <div className="max-w-5xl mx-auto px-4 flex">
            {(["readings", "shop", "reviews"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
                style={{ borderColor: tab === t ? GN : "transparent", color: tab === t ? GN : "#9a8e7e" }}>
                {t === "readings" ? "Readings (41)" : t === "shop" ? "Shop (18)" : "Reviews"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ── READINGS ── */}
        {tab === "readings" && (
          <div>
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
                    {isOpen && rows.map((r, ri) => (
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
        )}

        {/* ── SHOP ── */}
        {tab === "shop" && (
          <div>
            <div className="flex flex-wrap gap-1 mb-3">
              {(["all", ...PROD_CATS] as const).map(c => (
                <button key={c} onClick={() => setProdCat(c as any)} className="px-3 py-1 rounded text-xs font-medium capitalize transition-colors" style={pill(prodCat === c)}>
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
            <div className="rounded-lg overflow-hidden border bg-white" style={{ borderColor: BORDER }}>
              {filteredProds.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f1eb] transition-colors" style={{ borderTop: i > 0 ? `1px solid #f0ece4` : undefined }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium" style={{ color: DARK }}>{p.name}</span>
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 rounded capitalize">{p.category}</span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "#9a8e7e" }}>{p.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold" style={{ color: GN }}>${p.price}</span>
                    <Button size="sm" className="h-7 text-xs px-3 text-white gap-1" style={{ background: GN }} onClick={() => addToCart(p)}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="mt-4 rounded-lg border p-4 bg-white" style={{ borderColor: `${GOLD}55` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm flex items-center gap-2" style={{ color: DARK }}><ShoppingCart className="h-4 w-4" />Cart ({cartCount})</span>
                  <span className="font-bold text-sm" style={{ color: GN }}>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="space-y-2 mb-3">
                  {cart.map(i => (
                    <div key={i.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate" style={{ color: DARK }}>{i.name}</span>
                      <button onClick={() => updateQty(i.id, -1)} className="w-6 h-6 rounded border flex items-center justify-center" style={{ borderColor: BORDER }}><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center">{i.qty}</span>
                      <button onClick={() => updateQty(i.id, 1)} className="w-6 h-6 rounded border flex items-center justify-center" style={{ borderColor: BORDER }}><Plus className="h-3 w-3" /></button>
                      <span className="w-12 text-right text-xs" style={{ color: "#9a8e7e" }}>${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-8 text-sm text-white gap-2" style={{ background: "#2d7a6a" }} onClick={checkout}>
                  <MessageCircle className="h-4 w-4" /> Checkout via WhatsApp
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === "reviews" && (
          <div>
            <div className="flex items-center gap-5 bg-white rounded-lg border p-4 mb-4" style={{ borderColor: BORDER }}>
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: GN }}>{avgRating}</div>
                <div className="flex gap-0.5 mt-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#c9a96e] text-[#c9a96e]" />)}</div>
                <div className="text-xs mt-0.5" style={{ color: "#9a8e7e" }}>161 reviews</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5,4,3,2,1].map(s => (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="w-3" style={{ color: "#9a8e7e" }}>{s}</span>
                    <div className="flex-1 rounded-full h-1.5" style={{ background: "#ede8e0" }}>
                      <div className="h-1.5 rounded-full" style={{ width: s === 5 ? "90%" : s === 4 ? "10%" : "0%", background: "#c9a96e" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {SEEDED_REVIEWS.map(r => (
                <div key={r.id} className="bg-white rounded-lg border p-4" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-medium text-sm" style={{ color: DARK }}>{r.clientName}</span>
                      {r.readingName && <span className="text-xs ml-2" style={{ color: "#9a8e7e" }}>{r.readingName}</span>}
                    </div>
                    <div className="flex gap-0.5">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-[#c9a96e] text-[#c9a96e]" />)}</div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#5a5040" }}>"{r.comment}"</p>
                  <p className="text-[11px] mt-1.5" style={{ color: "#c0b8a8" }}>{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-xs py-5 mt-4 border-t" style={{ borderColor: BORDER, color: "#9a8e7e" }}>
        <span style={{ color: GN }}>✦ Elliestrator Botanica</span> · Harare, Zimbabwe · Worldwide
      </footer>
    </div>
  );
}
