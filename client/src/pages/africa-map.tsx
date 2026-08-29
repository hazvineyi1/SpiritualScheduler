import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { ComposableMap, Geographies, Sphere, Graticule } from "react-simple-maps";
import { geoCentroid, geoArea, type GeoProjection } from "d3-geo";
import { Button } from "@/components/ui/button";

const DARK          = "#1c1712";
const BORDER        = "#c9b896";
// Bronze palette (warmer, redder, and deeper than gold).
const BRONZE_LIGHT  = "#d9a468";
const BRONZE_MID    = "#b5732e";
const BRONZE_DEEP   = "#8a5a2b";
const BRONZE_DARK   = "#5c3d20";
const BRONZE_HOVER  = "#e08a4f";
const ACCENT_TEXT   = "#a2622f";

const GEO_URL = "/data/africa.json";

// How far each country's own boundary is pulled in toward its own center,
// so neighboring countries show a visible gap ("fragmented, pulled apart")
// while every country still sits exactly where it geographically belongs.
const FRAGMENT_SHRINK = 0.8;

// Uniform label styling — every label is the same size; a name is only
// shown if it both fits inside its own (now smaller) fragment AND doesn't
// collide with another already-placed label.
const LABEL_FONT_SIZE = 6.5;
const LABEL_PADDING = 1.5;
const CHAR_WIDTH_FACTOR = 0.56; // rough average glyph width at this font

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
// `scale`. Returns the SVG path string plus the shrunk shape's own bounding
// box, so callers can check whether a label actually fits inside it.
function buildFragment(geometry: any, projection: GeoProjection, center: Point, scale: number) {
  const shrink = (lonLat: Point): Point | null => {
    const p = projection(lonLat);
    if (!p) return null;
    return [center[0] + (p[0] - center[0]) * scale, center[1] + (p[1] - center[1]) * scale];
  };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const ringToPath = (ring: Point[]): string => {
    const pts = ring.map(shrink).filter((p): p is Point => p !== null);
    if (pts.length < 3) return "";
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return "M" + pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("L") + "Z";
  };
  let d = "";
  if (geometry.type === "Polygon") {
    d = geometry.coordinates.map(ringToPath).join(" ");
  } else if (geometry.type === "MultiPolygon") {
    d = geometry.coordinates.map((poly: Point[][]) => poly.map(ringToPath).join(" ")).join(" ");
  }
  const bbox = minX === Infinity ? null : { width: maxX - minX, height: maxY - minY };
  return { d, bbox };
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
            <Button size="sm" className="h-7 text-xs text-white" style={{ background: BRONZE_DARK }}>List Your Practice</Button>
          </Link>
        </div>
      </nav>

      {/* INTRO */}
      <section className="text-center px-4 pt-10 pb-4">
        <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: ACCENT_TEXT }}>Rooted in tradition</p>
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
              <stop offset="0%" stopColor={BRONZE_LIGHT} />
              <stop offset="35%" stopColor={BRONZE_MID} />
              <stop offset="70%" stopColor={BRONZE_DEEP} />
              <stop offset="100%" stopColor={BRONZE_DARK} />
            </linearGradient>
            <filter id="fragmentShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#2e1f0f" floodOpacity="0.6" />
            </filter>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <Sphere id="globe-sphere" fill="none" stroke={BRONZE_MID} strokeWidth={1.5} />
          <Graticule stroke={BRONZE_MID} strokeWidth={0.4} style={{ opacity: 0.28 }} />

          <g filter="url(#glow)">
            <Geographies geography={GEO_URL}>
              {({ geographies, projection }) => {
                // First pass: shrink every country toward its own centroid,
                // capturing both the fragment path and its own bounding box.
                const fragments = geographies.map((geo) => {
                  const slug = geo.properties!.slug as string;
                  const name = geo.properties!.name as string;
                  const area = geoArea(geo as any);
                  const centroid = projection(geoCentroid(geo as any) as Point);
                  const center: Point = centroid ?? [400, 400];
                  const { d, bbox } = buildFragment(geo.geometry, projection, center, FRAGMENT_SHRINK);
                  return { geo, slug, name, area, centroid, d, bbox };
                });

                // A label is only a candidate if it fits inside its own
                // fragment's bounding box — otherwise it's dropped before
                // collision checking even runs.
                const candidates: LabelCandidate[] = fragments
                  .filter(f => f.centroid && f.area > MIN_AREA_FOR_LABEL && f.bbox)
                  .map(f => ({ ...f, width: f.name.length * LABEL_FONT_SIZE * CHAR_WIDTH_FACTOR }))
                  .filter(f => f.width <= f.bbox!.width * 0.92 && LABEL_FONT_SIZE <= f.bbox!.height * 0.85)
                  .map(f => ({ key: f.slug, name: f.name, x: f.centroid![0], y: f.centroid![1], width: f.width }))
                  .sort((a, b) => b.width - a.width);
                const visibleLabels = placeLabels(candidates);

                return fragments.map(({ geo, slug, name, centroid, d }) => {
                  const isHovered = hovered === slug;
                  return (
                    <g key={geo.rsmKey}>
                      <path
                        d={d}
                        onMouseEnter={() => setHovered(slug)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => navigate(`/country/${slug}`)}
                        fill={isHovered ? BRONZE_HOVER : "url(#metalGradient)"}
                        stroke={isHovered ? "#ffffff" : "#2e1f0f"}
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
        <span style={{ color: BRONZE_DARK }}>✦ African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
