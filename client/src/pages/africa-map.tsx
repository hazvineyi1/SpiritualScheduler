import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { ComposableMap, Geographies } from "react-simple-maps";
import { geoCentroid, geoArea, type GeoProjection } from "d3-geo";
import { Button } from "@/components/ui/button";

const DARK         = "#1c1712";
const BORDER       = "#c9b896";
const BRONZE_DARK  = "#5c3d20";
const ACCENT_TEXT  = "#a2622f";

const GEO_URL = "/data/africa.json";
const TEXTURE_URL = "/images/bronze-texture.png";

// How far each country's own boundary is pulled in toward its own center,
// so neighboring countries show a visible gap ("fragmented, pulled apart")
// while every country still sits exactly where it geographically belongs.
const FRAGMENT_SHRINK = 0.8;

// Every country gets a label at this one uniform size. If it fits inside
// its own fragment with no collision, it sits directly on the country;
// otherwise it's pushed outward (away from the continent's center) with a
// thin leader line back to the country it names.
const LABEL_FONT_SIZE = 7;
const LABEL_PADDING = 1.5;
const CHAR_WIDTH_FACTOR = 0.56;

// A gentle side-to-side 3D tilt (not a full spin) — the map is flat, but
// this keeps a genuine sense of depth and motion. Paused while hovered.
const TILT_DEGREES = 8;
const TILT_PERIOD_MS = 22000;

type Point = [number, number];

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

interface PlacedLabel {
  slug: string;
  name: string;
  x: number;
  y: number;
  width: number;
  external: boolean;
  from?: Point;
}

function boxesOverlap(ax: number, ay: number, aw: number, bx: number, by: number, bw: number): boolean {
  const halfH = LABEL_FONT_SIZE / 2 + LABEL_PADDING;
  return Math.abs(ax - bx) < aw / 2 + bw / 2 + LABEL_PADDING * 2 && Math.abs(ay - by) < halfH * 2;
}

// Every country gets a label. Bigger countries claim their own space first;
// anything that doesn't fit its own fragment, or loses a collision, is
// pushed outward along the line from the continent's center through the
// country, trying increasing distances until it finds clear space — with a
// thin line drawn back to the country so it's still obvious which is which.
function placeAllLabels(
  fragments: { slug: string; name: string; area: number; centroid: Point | null; bbox: { width: number; height: number } | null }[],
  mapCenter: Point,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const ordered = fragments
    .filter(f => f.centroid)
    .sort((a, b) => b.area - a.area);

  for (const f of ordered) {
    const [cx, cy] = f.centroid!;
    const width = f.name.length * LABEL_FONT_SIZE * CHAR_WIDTH_FACTOR;
    const fitsOwnBox = !!f.bbox && width <= f.bbox.width * 0.92 && LABEL_FONT_SIZE <= f.bbox.height * 0.85;

    if (fitsOwnBox && !placed.some(p => boxesOverlap(cx, cy, width, p.x, p.y, p.width))) {
      placed.push({ slug: f.slug, name: f.name, x: cx, y: cy, width, external: false });
      continue;
    }

    const angle = Math.atan2(cy - mapCenter[1], cx - mapCenter[0]) || 0;
    let done = false;
    for (let dist = 16; dist <= 110; dist += 9) {
      const ex = cx + Math.cos(angle) * dist;
      const ey = cy + Math.sin(angle) * dist;
      if (!placed.some(p => boxesOverlap(ex, ey, width, p.x, p.y, p.width))) {
        placed.push({ slug: f.slug, name: f.name, x: ex, y: ey, width, external: true, from: [cx, cy] });
        done = true;
        break;
      }
    }
    if (!done) {
      const dist = 110;
      const ex = cx + Math.cos(angle) * dist;
      const ey = cy + Math.sin(angle) * dist;
      placed.push({ slug: f.slug, name: f.name, x: ex, y: ey, width, external: true, from: [cx, cy] });
    }
  }
  return placed;
}

export default function AfricaMap() {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [tilt, setTilt] = useState(0);
  const paused = useRef(false);
  const frame = useRef<number>();
  const pauseOffset = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let lastElapsed = 0;
    const tick = (now: number) => {
      if (!paused.current) {
        lastElapsed = now - start - pauseOffset.current;
        const phase = (lastElapsed % TILT_PERIOD_MS) / TILT_PERIOD_MS;
        setTilt(TILT_DEGREES * Math.sin(phase * Math.PI * 2));
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

      {/* MAP — flat, no globe/circle; only the countries carry the 3D look,
          with a gentle 3D tilt on the whole map for a sense of motion */}
      <div
        className="max-w-5xl mx-auto px-4 pb-4"
        style={{ perspective: 1600 }}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; setHovered(null); }}
      >
        <div style={{ transform: `rotateY(${tilt}deg)`, transformStyle: "preserve-3d" }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [21, 4], scale: 480 }}
            width={800}
            height={840}
            style={{ width: "100%", height: "auto" }}
          >
            <defs>
              <pattern id="bronzeTexture" patternUnits="userSpaceOnUse" x="0" y="0" width="760" height="700">
                <image href={TEXTURE_URL} x="0" y="0" width="760" height="700" preserveAspectRatio="none" />
              </pattern>
              <filter id="fragmentShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#2e1f0f" floodOpacity="0.65" />
              </filter>
            </defs>

            <Geographies geography={GEO_URL}>
              {({ geographies, projection }) => {
                const fragments = geographies.map((geo) => {
                  const slug = geo.properties!.slug as string;
                  const name = geo.properties!.name as string;
                  const area = geoArea(geo as any);
                  const centroid = projection(geoCentroid(geo as any) as Point);
                  const center: Point = centroid ?? [400, 420];
                  const { d, bbox } = buildFragment(geo.geometry, projection, center, FRAGMENT_SHRINK);
                  return { geo, slug, name, area, centroid, d, bbox };
                });

                const validCentroids = fragments.map(f => f.centroid).filter((p): p is Point => p !== null);
                const mapCenter: Point = validCentroids.length
                  ? [
                      validCentroids.reduce((s, p) => s + p[0], 0) / validCentroids.length,
                      validCentroids.reduce((s, p) => s + p[1], 0) / validCentroids.length,
                    ]
                  : [400, 420];

                const labels = placeAllLabels(fragments, mapCenter);
                const labelBySlug = new Map(labels.map(l => [l.slug, l]));

                return (
                  <>
                    {fragments.map(({ geo, slug, d }) => {
                      const isHovered = hovered === slug;
                      return (
                        <g key={geo.rsmKey}>
                          <path
                            d={d}
                            onMouseEnter={() => setHovered(slug)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => navigate(`/country/${slug}`)}
                            fill="url(#bronzeTexture)"
                            stroke="#2e1f0f"
                            strokeWidth={isHovered ? 1.1 : 0.7}
                            filter="url(#fragmentShadow)"
                            style={{ outline: "none", cursor: "pointer" }}
                          />
                          {isHovered && (
                            <path d={d} fill="#ffffff" opacity={0.22} style={{ pointerEvents: "none" }} />
                          )}
                        </g>
                      );
                    })}
                    {labels.map(l => (
                      <g key={`label-${l.slug}`}>
                        {l.external && l.from && (
                          <line
                            x1={l.from[0]} y1={l.from[1]} x2={l.x} y2={l.y}
                            stroke="#5c3d20" strokeWidth={0.5} strokeDasharray="1.5,1.2"
                            style={{ pointerEvents: "none" }}
                          />
                        )}
                        <text
                          x={l.x}
                          y={l.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: LABEL_FONT_SIZE,
                            fontWeight: 700,
                            fill: "#1c1006",
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "#f7ecd2",
                            strokeWidth: 2.1,
                            strokeLinejoin: "round",
                          }}
                        >
                          {l.name}
                        </text>
                      </g>
                    ))}
                  </>
                );
              }}
            </Geographies>
          </ComposableMap>
        </div>
      </div>

      <footer className="text-center text-xs py-6 border-t" style={{ borderColor: BORDER, color: "#8a7d63" }}>
        <span style={{ color: BRONZE_DARK }}>✦ African Spiritual Hub</span> · Every practitioner's hub is independent and self-contained
      </footer>
    </div>
  );
}
