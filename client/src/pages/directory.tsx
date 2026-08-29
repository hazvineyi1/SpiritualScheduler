import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, ArrowRight, Sparkles } from "lucide-react";

const BG     = "#faf7f2";
const HERO   = "#f0ead9";
const BORDER = "#ddd2bc";
const GN     = "#355e4a";
const DARK   = "#1c1712";
const GOLD   = "#a2532e";

interface PublicHealer {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  avatarUrl: string;
  headerImageUrl: string;
  zinathaVerified: boolean;
  readings: any[];
}

export default function Directory() {
  const { data: healers = [], isLoading } = useQuery<PublicHealer[]>({
    queryKey: ["/api/healers"],
  });

  return (
    <div style={{ background: BG, color: DARK, minHeight: "100vh" }}>
      {/* NAV */}
      <nav className="border-b" style={{ background: HERO, borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-wide" style={{ color: DARK }}>African Spiritual Hub</span>
          <Link href="/signup">
            <Button size="sm" className="h-7 text-xs text-white" style={{ background: GN }}>List Your Practice</Button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center px-4 py-14 border-b" style={{ background: HERO, borderColor: BORDER }}>
        <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: GOLD }}>Rooted in tradition</p>
        <h1 className="text-2xl sm:text-4xl font-semibold mb-3" style={{ color: DARK }}>African Spiritual Hub</h1>
        <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: "#5c5348" }}>
          A home for verified African spiritual practitioners — each with their own independent hub for readings, cleansing, and consultation, booked directly and privately.
        </p>
      </section>

      {/* HEALER GRID */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-1.5" style={{ color: "#7a6e5e" }}>
          <Sparkles className="h-3.5 w-3.5" /> Practitioner Hubs
        </h2>

        {isLoading && <p className="text-sm" style={{ color: "#9a8e7e" }}>Loading hubs…</p>}

        {!isLoading && healers.length === 0 && (
          <p className="text-sm" style={{ color: "#9a8e7e" }}>No hubs yet — be the first to list your practice.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {healers.map(h => (
            <Link key={h.id} href={`/${h.slug}`}>
              <div className="rounded-xl border overflow-hidden bg-white cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: BORDER }}>
                <div className="h-32 overflow-hidden" style={{ background: HERO }}>
                  {h.headerImageUrl && (
                    <img src={h.headerImageUrl} alt={h.name} className="w-full h-full object-cover" style={{ objectPosition: "center 25%" }} />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2.5 -mt-8 mb-2">
                    <img
                      src={h.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + h.name}
                      alt={h.name}
                      className="w-12 h-12 rounded-full object-cover border-2"
                      style={{ borderColor: BG }}
                    />
                    {h.zinathaVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border bg-white" style={{ borderColor: `${GOLD}66`, color: GOLD }}>
                        <Shield className="h-2.5 w-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: DARK }}>{h.name}</h3>
                  {h.tagline && <p className="text-xs italic mt-0.5 line-clamp-2" style={{ color: GOLD }}>"{h.tagline}"</p>}
                  {h.location && (
                    <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#8a7d6b" }}>
                      <MapPin className="h-3 w-3" /> {h.location}
                    </p>
                  )}
                  <p className="text-xs mt-2 flex items-center gap-1 font-medium" style={{ color: GN }}>
                    Visit hub <ArrowRight className="h-3 w-3" />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="text-center text-xs py-6 mt-6 border-t" style={{ borderColor: BORDER, color: "#9a8e7e" }}>
        <span style={{ color: GN }}>African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
