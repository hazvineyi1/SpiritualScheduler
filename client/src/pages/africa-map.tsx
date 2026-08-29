import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from "react-simple-maps";
import { geoCentroid, geoArea } from "d3-geo";
import { Button } from "@/components/ui/button";

const DARK        = "#1c1712";
const BORDER      = "#c9b896";
const BROWN_DARK  = "#6b5233";
const GOLD        = "#c9a227";
const GOLD_BRIGHT = "#f0d26a";
const GRID        = "#c9a227";

const GEO_URL = "/data/africa.json";

// Small island nations don't have room for a readable label at this scale;
// skip labels below this projected-area threshold (in steradians).
const MIN_AREA_FOR_LABEL = 0.0009;

// Roughly centers the globe on Africa: [longitude, latitude, roll], negated
// per d3-geo's rotation convention.
const AFRICA_CENTER: [number, number, number] = [-20, -3, 0];
// A slow, gentle side-to-side sway rather than a full spin, so Africa never
// rotates out of view — a full there-and-back cycle takes ~26 seconds.
const SWAY_DEGREES = 14;
const SWAY_PERIOD_MS = 26000;

export default function AfricaMap() {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [lambda, setLambda] = useState(AFRICA_CENTER[0]);
  const paused = useRef(false);
  const frame = useRef<number>();
  const pauseOffset = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let lastElapsed = 0;
    const tick = (now: number) => {
      if (!paused.current) {
        lastElapsed = now - start - pauseOffset.current;
        const phase = (lastElapsed % SWAY_PERIOD_MS) / SWAY_PERIOD_MS;
        setLambda(AFRICA_CENTER[0] + SWAY_DEGREES * Math.sin(phase * Math.PI * 2));
      } else {
        pauseOffset.current = now - start - lastElapsed;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  return (
    <div style={{ background: "#f5efe0", color: DARK, minHeight: "100vh" }}>
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

      {/* GLOBE */}
      <div
        className="max-w-4xl mx-auto px-4 pb-4"
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; setHovered(null); }}
      >
        <ComposableMap
          projection="geoOrthographic"
          projectionConfig={{ scale: 400, rotate: [lambda, AFRICA_CENTER[1], AFRICA_CENTER[2]] }}
          width={800}
          height={800}
          style={{ width: "100%", height: "auto" }}
        >
          <defs>
            <linearGradient id="metalGradient" gradientUnits="userSpaceOnUse" x1="200" y1="150" x2="600" y2="650">
              <stop offset="0%" stopColor="#f2dd9e" />
              <stop offset="35%" stopColor={GOLD} />
              <stop offset="70%" stopColor="#a97f3a" />
              <stop offset="100%" stopColor={BROWN_DARK} />
            </linearGradient>
            <filter id="fragmentShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#3a2a12" floodOpacity="0.55" />
            </filter>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <Sphere id="globe-sphere" fill="none" stroke={GOLD} strokeWidth={1.5} />
          <Graticule stroke={GRID} strokeWidth={0.4} style={{ opacity: 0.3 }} />

          <g filter="url(#glow)">
            <Geographies geography={GEO_URL}>
              {({ geographies, projection }) =>
                geographies.map((geo) => {
                  const name = geo.properties!.slug as string;
                  const displayName = geo.properties!.name as string;
                  const isHovered = hovered === name;
                  const area = geoArea(geo as any);
                  const showLabel = area > MIN_AREA_FOR_LABEL;
                  const centroid = projection(geoCentroid(geo as any) as [number, number]);

                  return (
                    <g key={geo.rsmKey}>
                      <Geography
                        geography={geo}
                        onMouseEnter={() => setHovered(name)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => navigate(`/country/${name}`)}
                        fill={isHovered ? GOLD_BRIGHT : "url(#metalGradient)"}
                        stroke={isHovered ? "#ffffff" : "#3a2a12"}
                        strokeWidth={isHovered ? 1.1 : 0.8}
                        filter="url(#fragmentShadow)"
                        style={{ outline: "none", cursor: "pointer", transition: "fill 120ms ease" }}
                      />
                      {showLabel && centroid && (
                        <text
                          x={centroid[0]}
                          y={centroid[1]}
                          textAnchor="middle"
                          style={{
                            fontSize: 6.5,
                            fontWeight: 600,
                            fill: "#2a1d0f",
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "#f5e9c8",
                            strokeWidth: 1.6,
                            strokeLinejoin: "round",
                          }}
                        >
                          {displayName}
                        </text>
                      )}
                    </g>
                  );
                })
              }
            </Geographies>
          </g>
        </ComposableMap>
      </div>

      <footer className="text-center text-xs py-6 border-t" style={{ borderColor: BORDER, color: "#8a7d63" }}>
        <span style={{ color: BROWN_DARK }}>✦ African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
