import { useState, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Reading, Product } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Shield, MessageCircle, Search, ChevronDown, ChevronRight, ShoppingBag, Plus, Minus, Leaf } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";

interface CartItem { id: number; name: string; price: number; qty: number; }

interface PublicHealer {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  whatsapp: string;
  avatarUrl: string;
  headerImageUrl: string;
  zinathaVerified: boolean;
  shopEnabled: boolean;
  readings: Reading[];
  products: Product[];
}

const BG     = "#f5efe0";
const HERO   = "#e6d7b3";
const BORDER = "#c9b896";
const GN     = "#2d4a3a";
const DARK   = "#1c1712";
const GOLD   = "#a2532e";

export default function Home() {
  const { slug } = useParams<{ slug: string }>();
  const { data: healer, isLoading, isError } = useQuery<PublicHealer>({
    queryKey: [`/api/healers/${slug}`],
  });

  const [tab, setTab] = useState<"readings" | "shop">("readings");
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<CartItem[]>([]);

  const readings = healer?.readings ?? [];
  const products = healer?.products ?? [];
  const allCats = useMemo(() => Array.from(new Set(readings.map(r => r.category))), [readings]);

  const toggleCat = (c: string) =>
    setOpenCats(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  const searchQ = search.toLowerCase().trim();
  const readingsByCat = useMemo(() => {
    const map: Record<string, Reading[]> = {};
    allCats.forEach(c => { map[c] = readings.filter(r => r.category === c && (!searchQ || r.name.toLowerCase().includes(searchQ))); });
    return map;
  }, [readings, allCats, searchQ]);

  const defaultOpen = allCats.length > 0 ? allCats[0] : null;

  const addToCart = (id: number) => {
    const p = products.find(p => p.id === id);
    if (!p) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing) return prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };
  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0));
  };
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const waLink = healer ? `https://wa.me/${healer.whatsapp}` : "";
  const checkout = () => {
    if (!healer) return;
    const lines = cart.map(c => `${c.qty}x ${c.name} ($${c.price * c.qty})`).join("\n");
    const msg = `Hi ${healer.name}! I'd like to order:\n${lines}\nTotal: $${cartTotal}`;
    window.open(`${waLink}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: "#9a8e7e" }}>Loading…</div>;
  }
  if (isError || !healer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: BG, color: DARK }}>
        <p className="text-sm">This hub doesn't exist.</p>
        <Link href="/"><Button size="sm" style={{ background: GN }} className="text-white">Back to African Spiritual Hub</Button></Link>
      </div>
    );
  }

  return (
    <div style={{ background: BG, color: DARK, minHeight: "100vh" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: HERO, borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href={`/${slug}`}><span className="font-semibold text-sm cursor-pointer" style={{ color: DARK }}>✦ {healer.name}</span></Link>
          <div className="flex items-center gap-2">
            <a href={waLink} target="_blank" rel="noreferrer">
              <Button size="sm" className="h-7 text-xs gap-1.5 text-white" style={{ background: GN }}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            </a>
            <Link href={`/${slug}/dashboard`}>
              <Button size="sm" variant="ghost" className="h-7 text-xs" style={{ color: "#6a5f50" }}>Healer Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HEADER BANNER: full width */}
      {healer.headerImageUrl && (
        <div className="w-full h-72 sm:h-96 md:h-[28rem] overflow-hidden">
          <img
            src={healer.headerImageUrl}
            alt={healer.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 25%" }}
          />
        </div>
      )}

      {/* HERO */}
      <section style={{ background: HERO, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {healer.avatarUrl && (
                <img
                  src={healer.avatarUrl}
                  alt={healer.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${GOLD}66` }}
                />
              )}
              <div>
                {healer.zinathaVerified && (
                  <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border mb-1" style={{ borderColor: `${GOLD}66`, color: GOLD }}>
                    <Shield className="h-3 w-3" /> ZINATHA Verified
                  </div>
                )}
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: DARK }}>{healer.name}</h1>
              </div>
            </div>
            {healer.tagline && <p className="text-xs italic mb-2" style={{ color: GOLD }}>"{healer.tagline}"</p>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-3" style={{ color: "#7a6e5e" }}>
              {healer.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{healer.location}</span>}
            </div>
            <a href={`${waLink}?text=${encodeURIComponent(`Hi ${healer.name}! I have a question.`)}`} target="_blank" rel="noreferrer">
              <Button className="h-8 text-sm gap-1.5 text-white" style={{ background: GN }}>
                <MessageCircle className="h-4 w-4" /> Message {healer.name}
              </Button>
            </a>
          </div>
          <div className="sm:w-52 flex flex-col gap-3">
            <div className="rounded-lg p-3 text-xs bg-white" style={{ border: `1px solid ${BORDER}` }}>
              <p className="font-medium mb-0.5" style={{ color: GN }}>🔒 Your privacy matters</p>
              <p style={{ color: "#7a6e5e" }}>Sessions are private and never recorded.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      {healer.shopEnabled && (
        <div className="border-b" style={{ borderColor: BORDER, background: BG }}>
          <div className="max-w-5xl mx-auto px-4 flex">
            {(["readings", "shop"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
                style={{ borderColor: tab === t ? GN : "transparent", color: tab === t ? GN : "#9a8e7e" }}>
                {t === "readings" ? `Readings (${readings.length})` : `Shop (${products.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {tab === "readings" && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <Input placeholder="Search readings…" className="pl-9 h-8 text-sm bg-white" style={{ borderColor: BORDER }}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {readings.length === 0 && <p className="text-sm text-center py-8" style={{ color: "#9a8e7e" }}>No readings listed yet.</p>}

            <div className="rounded-lg overflow-hidden border bg-white" style={{ borderColor: BORDER }}>
              {allCats.map((cat, ci) => {
                const rows = readingsByCat[cat];
                if (searchQ && rows.length === 0) return null;
                const isOpen = openCats.has(cat) || cat === defaultOpen || (searchQ.length > 0 && rows.length > 0);
                return (
                  <div key={cat} style={{ borderTop: ci > 0 ? `1px solid ${BORDER}` : undefined }}>
                    <button onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#f5f1eb]"
                      style={{ background: isOpen ? HERO : "white" }}>
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4" style={{ color: GN }} />
                        <span className="text-sm font-medium" style={{ color: DARK }}>{cat}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f0ece4", color: "#7a6e5e" }}>{rows.length}</span>
                      </div>
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: GN }} />
                        : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "#b0a898" }} />}
                    </button>

                    {isOpen && rows.map((r) => (
                      <div key={r.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5efe0] transition-colors"
                        style={{ borderTop: `1px solid #f0ece4`, paddingLeft: 52 }}>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="text-sm truncate" style={{ color: DARK }}>{r.name}</span>
                          {r.isAdult && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded flex-shrink-0">18+</span>}
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className="text-sm font-semibold" style={{ color: GN }}>${r.price}</span>
                          <Link href={`/${slug}/book/${r.id}`}>
                            <Button size="sm" className="h-7 text-xs px-3 text-white" style={{ background: GN }}>Book</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {readings.length > 0 && (
              <p className="text-center text-xs mt-2" style={{ color: "#b0a898" }}>{readings.length} reading{readings.length !== 1 ? "s" : ""} across {allCats.length} categor{allCats.length !== 1 ? "ies" : "y"} · tap a category to browse</p>
            )}
          </>
        )}

        {tab === "shop" && healer.shopEnabled && (
          <>
            {products.length === 0 && <p className="text-sm text-center py-8" style={{ color: "#9a8e7e" }}>No products listed yet.</p>}
            {products.length > 0 && (
              <div className="rounded-lg overflow-hidden border bg-white divide-y" style={{ borderColor: BORDER }}>
                {products.map(p => {
                  const inCart = cart.find(c => c.id === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "#f0ece4" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: DARK }}>{p.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#8a7d6b" }}>{p.description}</p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="text-sm font-semibold" style={{ color: GN }}>${p.price}</span>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(p.id, -1)} className="w-6 h-6 rounded border flex items-center justify-center" style={{ borderColor: BORDER }}><Minus className="h-3 w-3" /></button>
                            <span className="text-xs w-4 text-center">{inCart.qty}</span>
                            <button onClick={() => updateQty(p.id, 1)} className="w-6 h-6 rounded border flex items-center justify-center" style={{ borderColor: BORDER }}><Plus className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <Button size="sm" className="h-7 text-xs px-3 text-white" style={{ background: GN }} onClick={() => addToCart(p.id)}>Add</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-center text-xs mt-2" style={{ color: "#b0a898" }}>Order via WhatsApp</p>

            {cart.length > 0 && (
              <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 rounded-lg shadow-xl border p-3 bg-white z-40" style={{ borderColor: BORDER }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: DARK }}><ShoppingBag className="h-3.5 w-3.5" /> {cartCount} item{cartCount !== 1 ? "s" : ""}</span>
                  <span className="text-sm font-semibold" style={{ color: GN }}>${cartTotal}</span>
                </div>
                <Button className="w-full h-8 text-xs text-white" style={{ background: GN }} onClick={checkout}>Order via WhatsApp</Button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="text-center text-xs py-5 mt-4 border-t" style={{ borderColor: BORDER, color: "#9a8e7e" }}>
        <span style={{ color: GN }}>✦ {healer.name}</span>{healer.location ? ` · ${healer.location}` : ""}
      </footer>

      <ChatWidget healerName={healer.name} waLink={waLink} />
    </div>
  );
}
