import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { ComposableMap, Geographies, Sphere, Graticule } from "react-simple-maps";
import { geoCentroid, geoArea, type GeoProjection } from "d3-geo";
import { Button } from "@/components/ui/button";

const DARK        = "#1c1712";
const BORDER      = "#c9b896";
const BROWN_DARK  = "#6b5233";
const GOLD        = "#c9a227";
const GOLD_BRIGHT = "#f0d26a";
const GRID        = "#c9a227";

const GEO_URL = "/data/africa.json";

// How far each country's own boundary is pulled in toward its own center,
// so neighboring countries show a visible gap ("fragmented, pulled apart")
// while every country still sits exactly where it geographically belongs.
const FRAGMENT_SHRINK = 0.91;

// Uniform label styling — every label is the same size; countries whose
// label would collide with an already-placed one simply go unlabeled
// rather than shrinking, so what IS shown stays fully legible.
const LABEL_FONT_SIZE = 6.5;
const LABEL_PADDING = 1.5;

const MIN_AREA_FOR_LABEL = 0.00035;

// Roughly centers the globe on Africa: [longitude, latitude, roll], negated
// per d3-geo's rotation convention.
const AFRICA_CENTER: [number, number, number] = [-20, -3, 0];
// A slow, gentle side-to-side sway rather than a full spin, so Africa never
// rotates out of view — a full there-and-back cycle takes ~26 seconds.
const SWAY_DEGREES = 14;
const SWAY_PERIOD_MS = 26000;

type Point = [number, number];

// Projects a geometry's rings and shrinks every point toward `center` by
// `scale`, returning an SVG path string. Handles Polygon and MultiPolygon.
function buildFragmentPath(geometry: any, projection: GeoProjection, center: Point, scale: number): string {
  const shrink = (lonLat: Point): Point | null => {
    const p = projection(lonLat);
    if (!p) return null;
    return [center[0] + (p[0] - center[0]) * scale, center[1] + (p[1] - center[1]) * scale];
  };
  const ringToPath = (ring: Point[]): string => {
    const pts = ring.map(shrink).filter((p): p is Point => p !== null);
    if (pts.length < 3) return "";
    return "M" + pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("L") + "Z";
  };
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToPath).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((poly: Point[][]) => poly.map(ringToPath).join(" ")).join(" ");
  }
  return "";
}

interface LabelCandidate {
  key: string;
  name: string;
  x: number;
  y: number;
  width: number;
}

// Greedy label placement: biggest countries get first claim on the space;
// anything whose box would overlap an already-placed label is skipped
// entirely, so every label that IS shown is fully clear at the same size.
function placeLabels(candidates: LabelCandidate[]): Set<string> {
  const placed: { x: number; y: number; width: number }[] = [];
  const kept = new Set<string>();
  for (const c of candidates) {
    const halfW = c.width / 2 + LABEL_PADDING;
    const halfH = LABEL_FONT_SIZE / 2 + LABEL_PADDING;
    const overlaps = placed.some(p => {
      const pHalfW = p.width / 2 + LABEL_PADDING;
      const pHalfH = LABEL_FONT_SIZE / 2 + LABEL_PADDING;
      return Math.abs(c.x - p.x) < halfW + pHalfW && Math.abs(c.y - p.y) < halfH + pHalfH;
    });
    if (!overlaps) {
      placed.push({ x: c.x, y: c.y, width: c.width });
      kept.add(c.key);
    }
  }
  return kept;
}

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
            <filter id="fragmentShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#3a2a12" floodOpacity="0.6" />
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
              {({ geographies, projection }) => {
                // First pass: work out each visible country's true centroid
                // and an estimated label footprint, then greedily decide
                // which labels can be shown without colliding.
                const withCentroids = geographies.map((geo) => {
                  const slug = geo.properties!.slug as string;
                  const name = geo.properties!.name as string;
                  const area = geoArea(geo as any);
                  const centroid = projection(geoCentroid(geo as any) as Point);
                  return { geo, slug, name, area, centroid };
                });

                const candidates: LabelCandidate[] = withCentroids
                  .filter(c => c.centroid && c.area > MIN_AREA_FOR_LABEL)
                  .map(c => ({
                    key: c.slug,
                    name: c.name,
                    x: c.centroid![0],
                    y: c.centroid![1],
                    width: c.name.length * LABEL_FONT_SIZE * 0.56,
                  }))
                  .sort((a, b) => b.width - a.width);
                const visibleLabels = placeLabels(candidates);

                return withCentroids.map(({ geo, slug, name, centroid }) => {
                  const isHovered = hovered === slug;
                  const fragmentCenter: Point = centroid ?? [400, 400];
                  const d = buildFragmentPath(geo.geometry, projection, fragmentCenter, FRAGMENT_SHRINK);

                  return (
                    <g key={geo.rsmKey}>
                      <path
                        d={d}
                        onMouseEnter={() => setHovered(slug)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => navigate(`/country/${slug}`)}
                        fill={isHovered ? GOLD_BRIGHT : "url(#metalGradient)"}
                        stroke={isHovered ? "#ffffff" : "#3a2a12"}
                        strokeWidth={isHovered ? 1.1 : 0.7}
                        filter="url(#fragmentShadow)"
                        style={{ outline: "none", cursor: "pointer", transition: "fill 120ms ease" }}
                      />
                      {visibleLabels.has(slug) && centroid && (
                        <text
                          x={centroid[0]}
                          y={centroid[1]}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: LABEL_FONT_SIZE,
                            fontWeight: 600,
                            fill: "#2a1d0f",
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "#f5e9c8",
                            strokeWidth: 1.6,
                            strokeLinejoin: "round",
                          }}
                        >
                          {name}
                        </text>
                      )}
                    </g>
                  );
                });
              }}
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
