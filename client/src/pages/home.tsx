import { useState, useMemo } from "react";
import { Link } from "wouter";
import { READINGS, PRODUCTS, SEEDED_REVIEWS, CATEGORY_LABELS, FORMAT_LABELS } from "@shared/types";
import type { ReadingCategory } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, MapPin, Clock, Shield, MessageCircle, Search, ShoppingCart, X, Plus, Minus } from "lucide-react";

interface CartItem { id: number; name: string; price: number; qty: number; }

const FORMAT_PILL: Record<string, string> = {
  video: "bg-sky-100 text-sky-700",
  audio: "bg-violet-100 text-violet-700",
  chat: "bg-teal-100 text-teal-700",
  async: "bg-stone-100 text-stone-600",
  in_person: "bg-rose-100 text-rose-700",
};

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

export default function Home() {
  const [tab, setTab] = useState<"readings" | "shop" | "reviews">("readings");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<ReadingCategory | "all">("all");
  const [prodCat, setProdCat] = useState<typeof PROD_CATS[number] | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const filtered = useMemo(() => READINGS.filter(r => {
    const matchCat = catFilter === "all" || r.category === catFilter;
    const q = search.toLowerCase();
    return matchCat && (!q || r.name.toLowerCase().includes(q) || CATEGORY_LABELS[r.category].toLowerCase().includes(q));
  }), [catFilter, search]);

  const filteredProds = useMemo(() => PRODUCTS.filter(p => prodCat === "all" || p.category === prodCat), [prodCat]);

  const addToCart = (p: typeof PRODUCTS[0]) =>
    setCart(prev => prev.find(i => i.id === p.id)
      ? prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      : [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }]);

  const updateQty = (id: number, delta: number) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const whatsappCheckout = () => {
    const lines = cart.map(i => `• ${i.name} ×${i.qty} = $${(i.price * i.qty).toFixed(2)}`).join("\n");
    window.open(`${ELLIE_WA}?text=${encodeURIComponent(`Hi Ellie! Order:\n\n${lines}\n\nTotal: $${cartTotal.toFixed(2)} USD\n\nPlease confirm stock, payment & shipping. 🌿`)}`, "_blank");
  };

  const avgRating = (SEEDED_REVIEWS.reduce((s, r) => s + r.rating, 0) / SEEDED_REVIEWS.length).toFixed(1);

  return (
    <div className="min-h-screen" style={{ background: "#faf6f0", color: "#2c2418" }}>

      {/* NAV — slim */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "#1e2318", borderColor: "#2d3323" }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-wide" style={{ color: "#c9a96e" }}>✦ Elliestrator Botanica</span>
          <div className="flex items-center gap-2">
            <a href={ELLIE_WA} target="_blank" rel="noreferrer">
              <Button size="sm" className="h-7 text-xs gap-1.5 bg-teal-700 hover:bg-teal-800 text-white">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            </a>
            <Link href="/dashboard">
              <Button size="sm" variant="ghost" className="h-7 text-xs" style={{ color: "#9aaa8a" }}>
                Healer Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — compact */}
      <section style={{ background: "#1e2318" }}>
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Left: identity */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs mb-3" style={{ borderColor: "#c9a96e44", color: "#c9a96e" }}>
              <Shield className="h-3 w-3" /> ZINATHA Verified
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Elliestrator Botanica</h1>
            <p className="text-sm italic mb-3" style={{ color: "#c9a96e" }}>"Where Ancient Wisdom Meets Modern Healing"</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-4" style={{ color: "#8aaa7a" }}>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Harare, Zimbabwe · worldwide</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~24h response</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#c9a96e] text-[#c9a96e]" />)}
              <span className="text-white text-sm font-medium">4.9</span>
              <span className="text-xs" style={{ color: "#7a907a" }}>(161 reviews)</span>
            </div>
            <a href={`${ELLIE_WA}?text=${encodeURIComponent("Hi Ellie! I have a question about a reading.")}`} target="_blank" rel="noreferrer">
              <Button className="h-8 text-sm bg-teal-700 hover:bg-teal-800 text-white gap-1.5">
                <MessageCircle className="h-4 w-4" /> Message Ellie
              </Button>
            </a>
          </div>
          {/* Right: privacy note */}
          <div className="sm:max-w-[220px] rounded-lg p-4 text-xs" style={{ background: "#16201222", border: "1px solid #2d3323" }}>
            <p className="font-medium mb-1" style={{ color: "#c9a96e" }}>🔒 Privacy first</p>
            <p style={{ color: "#8aaa7a" }}>Your readings and conversations are never recorded or stored. Sessions are private, ephemeral, and confidential.</p>
          </div>
        </div>

        {/* Tab strip */}
        <div className="border-t" style={{ borderColor: "#2d3323" }}>
          <div className="max-w-5xl mx-auto px-4 flex">
            {(["readings", "shop", "reviews"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
                style={{ borderColor: tab === t ? "#c9a96e" : "transparent", color: tab === t ? "#c9a96e" : "#7a907a" }}>
                {t === "readings" ? `Readings (41)` : t === "shop" ? `Shop (18)` : "Reviews"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 py-5">

        {/* ── READINGS ── */}
        {tab === "readings" && (
          <div>
            {/* Filter row */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <Input placeholder="Search…" className="pl-8 h-8 text-sm w-44 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setCatFilter("all")}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: catFilter === "all" ? "#4a6741" : "#f0ebe3", color: catFilter === "all" ? "white" : "#5a5040" }}>
                  All
                </button>
                {ALL_CATS.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                    style={{ background: catFilter === c ? "#4a6741" : "#f0ebe3", color: catFilter === c ? "white" : "#5a5040" }}>
                    {CAT_ICON[c]} {CATEGORY_LABELS[c].split(" & ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact list */}
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#e5ddd0", background: "white" }}>
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-sm">No readings match your search.</div>
              ) : filtered.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf6f0] transition-colors" style={{ borderTop: idx > 0 ? "1px solid #f0ebe3" : undefined }}>
                  <span className="text-base flex-shrink-0 w-6 text-center">{CAT_ICON[r.category]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-[#2c2418] leading-tight">{r.name}</span>
                      {r.isAdult && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0 rounded font-medium">18+</span>}
                      {r.isFixed && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0 rounded font-medium">fixed</span>}
                    </div>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {r.formats.map(f => (
                        <span key={f} className={`text-[10px] px-1.5 py-0 rounded font-medium ${FORMAT_PILL[f]}`}>{FORMAT_LABELS[f]}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold" style={{ color: "#4a6741" }}>${r.price}</span>
                    <Link href={`/book/${r.id}`}>
                      <Button size="sm" className="h-7 text-xs px-3 bg-[#4a6741] hover:bg-[#3d5736] text-white">Book</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SHOP ── */}
        {tab === "shop" && (
          <div>
            <div className="flex flex-wrap gap-1 mb-4">
              {(["all", ...PROD_CATS] as const).map(c => (
                <button key={c} onClick={() => setProdCat(c as any)}
                  className="px-3 py-1 rounded text-xs font-medium capitalize transition-colors"
                  style={{ background: prodCat === c ? "#4a6741" : "#f0ebe3", color: prodCat === c ? "white" : "#5a5040" }}>
                  {c === "all" ? "All Products" : c}
                </button>
              ))}
            </div>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#e5ddd0", background: "white" }}>
              {filteredProds.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf6f0] transition-colors" style={{ borderTop: idx > 0 ? "1px solid #f0ebe3" : undefined }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[#2c2418]">{p.name}</span>
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 rounded capitalize">{p.category}</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold" style={{ color: "#4a6741" }}>${p.price}</span>
                    <Button size="sm" className="h-7 text-xs px-3 bg-[#4a6741] hover:bg-[#3d5736] text-white gap-1" onClick={() => addToCart(p)}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="mt-4 rounded-lg border p-4" style={{ borderColor: "#c9a96e55", background: "#fffbf3" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart ({cartCount} items)</span>
                  <span className="font-bold text-sm" style={{ color: "#4a6741" }}>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="space-y-2 mb-3">
                  {cart.map(i => (
                    <div key={i.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{i.name}</span>
                      <button onClick={() => updateQty(i.id, -1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-stone-100"><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center">{i.qty}</span>
                      <button onClick={() => updateQty(i.id, 1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-stone-100"><Plus className="h-3 w-3" /></button>
                      <span className="w-12 text-right text-stone-500">${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-8 text-sm bg-teal-700 hover:bg-teal-800 text-white gap-2" onClick={whatsappCheckout}>
                  <MessageCircle className="h-4 w-4" /> Checkout via WhatsApp
                </Button>
                <p className="text-center text-xs text-stone-400 mt-1.5">Ellie confirms stock, payment & shipping over WhatsApp</p>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === "reviews" && (
          <div>
            <div className="flex items-center gap-5 bg-white rounded-lg border p-4 mb-4" style={{ borderColor: "#e5ddd0" }}>
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: "#4a6741" }}>{avgRating}</div>
                <div className="flex gap-0.5 mt-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#c9a96e] text-[#c9a96e]" />)}</div>
                <div className="text-xs text-stone-400 mt-0.5">161 reviews</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5,4,3,2,1].map(s => {
                  const pct = s === 5 ? 90 : s === 4 ? 10 : 0;
                  return (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-stone-400">{s}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "#c9a96e" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              {SEEDED_REVIEWS.map(r => (
                <div key={r.id} className="bg-white rounded-lg border p-4" style={{ borderColor: "#e5ddd0" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-medium text-sm">{r.clientName}</span>
                      {r.readingName && <span className="text-xs text-stone-400 ml-2">{r.readingName}</span>}
                    </div>
                    <div className="flex gap-0.5">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-[#c9a96e] text-[#c9a96e]" />)}</div>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">"{r.comment}"</p>
                  <p className="text-[11px] text-stone-300 mt-1.5">{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="text-center text-xs py-5 mt-6 border-t" style={{ borderColor: "#e5ddd0", color: "#9a9080" }}>
        <span style={{ color: "#4a6741" }}>✦ Elliestrator Botanica</span> · Harare, Zimbabwe · Worldwide
      </footer>
    </div>
  );
}
