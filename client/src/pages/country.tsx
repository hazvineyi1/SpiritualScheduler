import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, ArrowRight, ChevronLeft } from "lucide-react";
import { AFRICAN_COUNTRIES } from "@shared/countries";

const BG      = "#f5efe0";
const HERO    = "#e6d7b3";
const BORDER  = "#c9b896";
const GN      = "#2d4a3a";
const DARK    = "#1c1712";
const GOLD    = "#a2532e";

interface PublicHealer {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  avatarUrl: string;
  headerImageUrl: string;
  zinathaVerified: boolean;
  createdAt: string;
  readings: any[];
}

type SortOption = "name" | "newest" | "verified";

export default function CountryHub() {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<SortOption>("verified");

  const country = AFRICAN_COUNTRIES.find(c => c.slug === slug);

  const { data: healers = [], isLoading } = useQuery<PublicHealer[]>({
    queryKey: [`/api/healers?country=${slug}`],
  });

  const sorted = useMemo(() => {
    const list = [...healers];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "newest") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "verified") list.sort((a, b) => Number(b.zinathaVerified) - Number(a.zinathaVerified) || a.name.localeCompare(b.name));
    return list;
  }, [healers, sort]);

  return (
    <div style={{ background: BG, color: DARK, minHeight: "100vh" }}>
      {/* NAV */}
      <nav className="border-b" style={{ background: HERO, borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/"><span className="font-semibold text-sm cursor-pointer" style={{ color: DARK }}>✦ African Spiritual Hub</span></Link>
          <Link href="/signup">
            <Button size="sm" className="h-7 text-xs text-white" style={{ background: GN }}>List Your Practice</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/"><p className="text-xs flex items-center gap-1 mb-4 cursor-pointer" style={{ color: "#8a7d63" }}><ChevronLeft className="h-3.5 w-3.5" /> Back to map</p></Link>

        <h1 className="text-2xl sm:text-3xl font-semibold mb-1" style={{ color: DARK }}>
          {country ? country.name : "Unknown country"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "#6b5f4a" }}>
          {isLoading ? "Loading hubs…" : `${healers.length} practitioner hub${healers.length !== 1 ? "s" : ""} here`}
        </p>

        {!isLoading && healers.length > 0 && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs" style={{ color: "#8a7d63" }}>Sort by</span>
            {([
              { value: "verified", label: "Verified first" },
              { value: "name", label: "Name A–Z" },
              { value: "newest", label: "Newest" },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setSort(opt.value)}
                className="text-xs px-3 py-1 rounded-full border transition-colors"
                style={{
                  borderColor: sort === opt.value ? GN : BORDER,
                  background: sort === opt.value ? GN : "white",
                  color: sort === opt.value ? "white" : "#6b5f4a",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {!isLoading && healers.length === 0 && (
          <div className="rounded-xl border bg-white p-10 text-center" style={{ borderColor: BORDER }}>
            <p className="text-sm mb-3" style={{ color: "#6b5f4a" }}>No hubs here yet.</p>
            <Link href="/signup">
              <Button size="sm" className="text-white" style={{ background: GN }}>Be the first to list your practice</Button>
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(h => (
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
                      style={{ borderColor: "#ffffff" }}
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

      <footer className="text-center text-xs py-6 border-t" style={{ borderColor: BORDER, color: "#8a7d63" }}>
        <span style={{ color: GN }}>✦ African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
