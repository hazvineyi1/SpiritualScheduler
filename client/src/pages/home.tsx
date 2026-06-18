import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { READINGS, PRODUCTS, SEEDED_REVIEWS, CATEGORY_LABELS, FORMAT_LABELS } from "@shared/types";
import type { ReadingCategory } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Clock, Shield, MessageCircle, Search, ShoppingCart, X, Plus, Minus, Sparkles, Eye, Moon } from "lucide-react";

interface CartItem { id: number; name: string; price: number; qty: number; }

const FORMAT_COLORS: Record<string, string> = {
  video: "bg-blue-100 text-blue-700",
  audio: "bg-purple-100 text-purple-700",
  chat: "bg-green-100 text-green-700",
  async: "bg-amber-100 text-amber-700",
  in_person: "bg-rose-100 text-rose-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  love_relationships: "💕",
  ancestors_spirit: "🌿",
  healing_wellbeing: "✨",
  spells_protection: "🔮",
  guidance_future: "🌟",
  live_in_person: "🎴",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ReadingCategory[];
const PRODUCT_CATS = ["incense", "crystals", "jewellery", "oils"] as const;

export default function Home() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"readings" | "shop" | "reviews">("readings");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<ReadingCategory | "all">("all");
  const [prodCat, setProdCat] = useState<typeof PRODUCT_CATS[number] | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const filteredReadings = useMemo(() => {
    return READINGS.filter(r => {
      const matchesCat = catFilter === "all" || r.category === catFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [catFilter, search]);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => prodCat === "all" || p.category === prodCat);
  }, [prodCat]);

  const addToCart = (p: typeof PRODUCTS[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const whatsappCheckout = () => {
    const lines = cart.map(i => `• ${i.name} ×${i.qty} = $${(i.price * i.qty).toFixed(2)}`).join("\n");
    const msg = `Hi Ellie! I'd like to order from Elliestrator Botanica:\n\n${lines}\n\n*Total: $${cartTotal.toFixed(2)} USD*\n\nPlease confirm availability, payment details, and shipping. Thank you! 🌿`;
    window.open(`https://wa.me/263771234567?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const avgRating = (SEEDED_REVIEWS.reduce((s, r) => s + r.rating, 0) / SEEDED_REVIEWS.length).toFixed(1);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a0a3e]/95 backdrop-blur border-b border-purple-900/40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-amber-400 font-bold text-lg tracking-wide">✦ Elliestrator Botanica</span>
          <div className="flex items-center gap-3">
            <a href="https://wa.me/263771234567" target="_blank" rel="noreferrer">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 hidden sm:flex">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
            <Link href="/dashboard">
              <Button size="sm" variant="ghost" className="text-purple-200 hover:text-white hover:bg-white/10">
                Healer Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#1a0a3e] pt-14">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1 text-amber-400 text-xs font-medium mb-6">
            <Shield className="h-3.5 w-3.5" /> ZINATHA Verified Traditional Healer
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-3 tracking-tight">Elliestrator Botanica</h1>
          <p className="text-amber-300 text-xl font-light italic mb-6">"Where Ancient Wisdom Meets Modern Healing"</p>
          <div className="flex flex-wrap justify-center gap-4 text-purple-200 text-sm mb-8">
            <span className="flex items-center gap-1.5"><Moon className="h-4 w-4 text-amber-400" /> Shona / Eclectic Tradition</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-400" /> Harare, Zimbabwe</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-400" /> ~24h response</span>
            <span className="flex items-center gap-1.5"><Eye className="h-4 w-4 text-amber-400" /> English & Shona</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-white font-semibold ml-1">4.9</span>
            <span className="text-purple-300">({SEEDED_REVIEWS.length * 23} reviews)</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-10">
            <Button size="lg" className="bg-amber-400 hover:bg-amber-500 text-[#1a0a3e] font-bold px-8" onClick={() => setTab("readings")}>
              <Sparkles className="h-5 w-5 mr-2" /> Browse Readings
            </Button>
            <a href="https://wa.me/263771234567?text=Hi%20Ellie!%20I%20have%20a%20question%20about%20a%20reading." target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10 px-8 w-full sm:w-auto">
                <MessageCircle className="h-5 w-5 mr-2" /> Message Ellie
              </Button>
            </a>
          </div>
          <p className="text-purple-300/70 text-xs max-w-md mx-auto">
            🔒 Your readings and conversations are never recorded or stored. Sessions are private, ephemeral, and confidential.
          </p>
        </div>

        {/* TAB BAR */}
        <div className="border-t border-purple-900/50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex">
              {(["readings", "shop", "reviews"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-amber-400 text-amber-400" : "border-transparent text-purple-300 hover:text-white"}`}>
                  {t === "readings" ? "✦ Readings (41)" : t === "shop" ? "🛍 Shop (18)" : "⭐ Reviews"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* READINGS TAB */}
        {tab === "readings" && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search readings…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setCatFilter("all")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${catFilter === "all" ? "bg-primary text-white" : "bg-white border border-border hover:border-primary text-muted-foreground"}`}>All ({READINGS.length})</button>
              {ALL_CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${catFilter === c ? "bg-primary text-white" : "bg-white border border-border hover:border-primary text-muted-foreground"}`}>
                  {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]} ({READINGS.filter(r => r.category === c).length})
                </button>
              ))}
            </div>
            {filteredReadings.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No readings match your search.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReadings.map(r => (
                  <Card key={r.id} className="hover:shadow-lg transition-shadow flex flex-col">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{CATEGORY_ICONS[r.category]} {CATEGORY_LABELS[r.category]}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {r.isAdult && <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">18+</Badge>}
                          {r.isFixed && <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Fixed</Badge>}
                        </div>
                      </div>
                      <h3 className="font-semibold text-base mb-1.5 text-foreground leading-snug">{r.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 flex-1 leading-relaxed">{r.description.split(".")[0]}.</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {r.formats.map(f => (
                          <span key={f} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FORMAT_COLORS[f]}`}>{FORMAT_LABELS[f]}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-lg font-bold text-primary">${r.price}</span>
                        <Link href={`/book/${r.id}`}>
                          <Button size="sm" className="bg-primary hover:bg-primary/90">Book Now</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SHOP TAB */}
        {tab === "shop" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setProdCat("all")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${prodCat === "all" ? "bg-primary text-white" : "bg-white border border-border hover:border-primary text-muted-foreground"}`}>All Products</button>
              {PRODUCT_CATS.map(c => (
                <button key={c} onClick={() => setProdCat(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${prodCat === c ? "bg-primary text-white" : "bg-white border border-border hover:border-primary text-muted-foreground"}`}>{c}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(p => (
                <Card key={p.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground capitalize font-medium">{p.category}</span>
                    <h3 className="font-semibold text-sm mt-1 mb-1.5 leading-snug">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">${p.price}</span>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => addToCart(p)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="fixed bottom-6 right-6 z-40">
                <Button onClick={() => setShowCart(true)} className="rounded-full h-14 w-14 shadow-xl bg-primary relative">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-[#1a0a3e] rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center">{cartCount}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* REVIEWS TAB */}
        {tab === "reviews" && (
          <div>
            <div className="bg-white rounded-xl p-6 mb-6 border flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary">{avgRating}</div>
                <div className="flex gap-1 justify-center my-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}</div>
                <div className="text-sm text-muted-foreground">{SEEDED_REVIEWS.length * 23} reviews</div>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {[5,4,3,2,1].map(star => {
                  const count = SEEDED_REVIEWS.filter(r => r.rating === star).length;
                  const pct = Math.round((count / SEEDED_REVIEWS.length) * 100);
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-4 text-muted-foreground text-right">{star}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <div className="flex-1 bg-stone-100 rounded-full h-2">
                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${pct || (star === 5 ? 90 : star === 4 ? 15 : 0)}%` }} />
                      </div>
                      <span className="text-muted-foreground w-6">{pct || (star === 5 ? 90 : star === 4 ? 10 : 0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {SEEDED_REVIEWS.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{r.clientName}</p>
                        {r.readingName && <p className="text-xs text-muted-foreground">{r.readingName}</p>}
                      </div>
                      <div className="flex gap-0.5">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">"{r.comment}"</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">{r.date}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CART DRAWER */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Your Cart</h2>
              <button onClick={() => setShowCart(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-semibold">
                <span>Total</span><span>${cartTotal.toFixed(2)} USD</span>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 gap-2" onClick={whatsappCheckout}>
                <MessageCircle className="h-4 w-4" /> Checkout via WhatsApp
              </Button>
              <p className="text-xs text-center text-muted-foreground">Ellie will confirm availability, payment & shipping over WhatsApp.</p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#1a0a3e] text-purple-300 mt-16 py-8 px-4 text-center text-sm">
        <p className="text-amber-400 font-semibold mb-1">✦ Elliestrator Botanica</p>
        <p className="mb-1">Harare, Zimbabwe · Serving clients worldwide</p>
        <p className="text-purple-400/70 text-xs">Your readings and conversations are never recorded or stored. All sessions are private and confidential.</p>
      </footer>
    </div>
  );
}
