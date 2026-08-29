import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Button } from "@/components/ui/button";
import { AFRICAN_COUNTRIES } from "@shared/countries";

const COUNTRY_NAME_BY_SLUG = Object.fromEntries(AFRICAN_COUNTRIES.map(c => [c.slug, c.name]));

const BG      = "#f5efe0";
const DARK    = "#1c1712";
const BORDER  = "#c9b896";
const BROWN   = "#8a6a45";
const BROWN_DARK = "#6b5233";
const GOLD    = "#c9a227";
const STROKE  = "#f5efe0";

const GEO_URL = "/data/africa.json";

export default function AfricaMap() {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ background: BG, color: DARK, minHeight: "100vh" }}>
      {/* NAV */}
      <nav className="border-b" style={{ borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-wide" style={{ color: DARK }}>✦ African Spiritual Hub</span>
          <Link href="/signup">
            <Button size="sm" className="h-7 text-xs text-white" style={{ background: BROWN_DARK }}>List Your Practice</Button>
          </Link>
        </div>
      </nav>

      {/* INTRO */}
      <section className="text-center px-4 pt-10 pb-4">
        <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: GOLD }}>Rooted in tradition</p>
        <h1 className="text-2xl sm:text-4xl font-semibold mb-3" style={{ color: DARK }}>Find a Healer by Country</h1>
        <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: "#6b5f4a" }}>
          Choose the country you align with, or where your healer originates from, to see the practitioner hubs there.
        </p>
      </section>

      {/* MAP */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [22, 2], scale: 420 }}
          width={800}
          height={800}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties!.slug as string;
                const isHovered = hovered === name;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHovered(name)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => navigate(`/country/${name}`)}
                    fill={isHovered ? GOLD : BROWN}
                    stroke={STROKE}
                    strokeWidth={0.75}
                    style={{ outline: "none", cursor: "pointer", transition: "fill 120ms ease" }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        <p className="text-center text-sm mt-1 h-5" style={{ color: BROWN_DARK }}>
          {hovered ? COUNTRY_NAME_BY_SLUG[hovered] ?? "\u00A0" : "\u00A0"}
        </p>
      </div>

      <footer className="text-center text-xs py-6 border-t" style={{ borderColor: BORDER, color: "#8a7d63" }}>
        <span style={{ color: BROWN_DARK }}>✦ African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
