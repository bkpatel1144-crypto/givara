/**
 * Procedural front-view ring illustration. Used as the preview whenever 3D
 * models are not configured or fail to load, and as the bag thumbnail. It
 * reflects metal colour, band style, side setting, crown and stone shape/size.
 */
import { useId } from "react";
import type { Metal, RingConfiguration } from "@/types/ring";
import { ShapeIcon } from "./RingIcons";

const METAL_SHADES: Record<Metal, { light: string; mid: string; dark: string }> = {
  "White Gold": { light: "#fbfbfa", mid: "#d9dadb", dark: "#9ea1a5" },
  "Yellow Gold": { light: "#fbe8b0", mid: "#e2b866", dark: "#a8772a" },
  "Rose Gold": { light: "#fbd9c6", mid: "#e3a585", dark: "#a8664b" },
};

const CX = 200;
const CY = 240;
const R = 110;

// Math.cos/sin/cbrt can differ in the last bit between Node (SSR) and browsers,
// which causes hydration mismatches. Round every transcendental result.
const r2 = (n: number) => Math.round(n * 100) / 100;
const deg = (d: number) => (d * Math.PI) / 180;
const point = (angle: number, radius = R) => ({
  x: r2(CX + radius * Math.cos(deg(angle))),
  y: r2(CY + radius * Math.sin(deg(angle))),
});
const arc = (from: number, to: number, radius = R) => {
  const a = point(from, radius);
  const b = point(to, radius);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${radius} ${radius} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

const TOP_FROM = -125;
const TOP_TO = -55;

export function RingIllustration({
  configuration,
  className,
  title,
}: {
  configuration: Pick<
    RingConfiguration,
    "metal" | "ringStyle" | "sideSetting" | "crownSetting" | "diamondShape" | "centerDiamondSize"
  >;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const metalId = `metal-${uid}`;
  const stoneId = `stone-${uid}`;
  const shade = METAL_SHADES[configuration.metal];
  const metal = `url(#${metalId})`;
  const stone = `url(#${stoneId})`;
  const { ringStyle, sideSetting, crownSetting } = configuration;

  const isSplit = ringStyle === "split" || ringStyle === "two-row-split";
  const stoneSize = r2(58 * Math.cbrt(Number(configuration.centerDiamondSize) || 1));
  const stoneCy = CY - R - stoneSize * 0.42 - 6;

  // Bottom of the band, drawn clockwise from the upper right to the upper left.
  const lower = (() => {
    const a = point(TOP_TO);
    const b = point(TOP_FROM);
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${R} ${R} 0 1 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  })();

  const upperBand = () => {
    const common = { fill: "none", stroke: metal, strokeLinecap: "round" as const };
    switch (ringStyle) {
      case "split":
        return (
          <>
            <path d={arc(TOP_FROM, TOP_TO, R + 8)} strokeWidth={7} {...common} />
            <path d={arc(TOP_FROM, TOP_TO, R - 8)} strokeWidth={7} {...common} />
          </>
        );
      case "two-row-split":
        return (
          <>
            <path d={arc(TOP_FROM, TOP_TO, R + 9)} strokeWidth={6} {...common} />
            <path d={arc(TOP_FROM, TOP_TO, R)} strokeWidth={4} {...common} />
            <path d={arc(TOP_FROM, TOP_TO, R - 9)} strokeWidth={6} {...common} />
          </>
        );
      case "twist": {
        const a1 = point(TOP_FROM, R + 8);
        const b1 = point(TOP_TO, R - 8);
        const a2 = point(TOP_FROM, R - 8);
        const b2 = point(TOP_TO, R + 8);
        return (
          <>
            <path
              d={`M${a1.x} ${a1.y} Q${CX} ${CY - R - 35} ${b1.x} ${b1.y}`}
              strokeWidth={8}
              {...common}
            />
            <path
              d={`M${a2.x} ${a2.y} Q${CX} ${CY - R - 5} ${b2.x} ${b2.y}`}
              strokeWidth={8}
              {...common}
            />
          </>
        );
      }
      case "pinch":
        return <path d={arc(TOP_FROM, TOP_TO)} strokeWidth={8} {...common} />;
      default:
        return <path d={arc(TOP_FROM, TOP_TO)} strokeWidth={14} {...common} />;
    }
  };

  const sideStones = () => {
    if (sideSetting === "plain-gold") return null;
    const step = sideSetting === "pave" ? 7 : sideSetting === "prong" ? 10 : 8;
    const radius = isSplit ? R + 8 : R;
    const angles: number[] = [];
    for (let a = -145; a <= -35; a += step) {
      if (Math.abs(a + 90) > 14) angles.push(a);
    }
    return (
      <g>
        {sideSetting === "channel" && (
          <>
            <path d={arc(-145, -104, radius)} stroke={shade.dark} strokeWidth={9} fill="none" />
            <path d={arc(-76, -35, radius)} stroke={shade.dark} strokeWidth={9} fill="none" />
          </>
        )}
        {angles.map((a) => {
          const p = point(a, radius);
          if (sideSetting === "channel") {
            return (
              <rect
                key={a}
                x={p.x - 3}
                y={p.y - 3}
                width={6}
                height={6}
                transform={`rotate(${a + 90} ${p.x} ${p.y})`}
                fill={stone}
                stroke="#8d969e"
                strokeWidth={0.6}
              />
            );
          }
          const r = sideSetting === "pave" ? 3.2 : 4.2;
          return (
            <g key={a}>
              <circle cx={p.x} cy={p.y} r={r} fill={stone} stroke="#8d969e" strokeWidth={0.7} />
              {sideSetting === "prong" && (
                <circle cx={p.x} cy={p.y - r - 1} r={1.2} fill={shade.mid} />
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const head = () => {
    const s = stoneSize;
    const top = CY - R;
    const haloStones =
      crownSetting === "single-halo"
        ? Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            return {
              x: r2(CX + Math.cos(a) * s * 0.64),
              y: r2(stoneCy + Math.sin(a) * s * 0.64),
              r: 3.6,
            };
          })
        : crownSetting === "hidden-halo"
          ? Array.from({ length: 7 }, (_, i) => ({
              x: CX - s * 0.33 + (i * s * 0.66) / 6,
              y: stoneCy + s * 0.48,
              r: 2.8,
            }))
          : [];

    return (
      <g>
        {/* basket and prongs */}
        <path
          d={`M${CX - s * 0.3} ${top + 2} L${CX - s * 0.42} ${stoneCy - s * 0.3} M${CX + s * 0.3} ${top + 2} L${CX + s * 0.42} ${stoneCy - s * 0.3}`}
          stroke={metal}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
        {ringStyle === "cathedral-straight" && (
          <path
            d={`M${point(-122).x} ${point(-122).y} Q${CX - 45} ${top - 20} ${CX - s * 0.3} ${top + 2} M${point(-58).x} ${point(-58).y} Q${CX + 45} ${top - 20} ${CX + s * 0.3} ${top + 2}`}
            stroke={metal}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {haloStones.map((h, i) => (
          <circle
            key={i}
            cx={h.x}
            cy={h.y}
            r={h.r}
            fill={stone}
            stroke="#8d969e"
            strokeWidth={0.7}
          />
        ))}
        <ShapeIcon
          shape={configuration.diamondShape}
          size={s * 1.12}
          x={CX - (s * 1.12) / 2}
          y={stoneCy - (s * 1.12) / 2}
          stroke="#7f8a94"
          fill={stone}
        />
        {[-1, 1].map((side) => (
          <circle
            key={side}
            cx={CX + side * s * 0.42}
            cy={stoneCy - s * 0.3}
            r={3}
            fill={shade.mid}
          />
        ))}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label={title ?? "Ring illustration"}
    >
      <defs>
        <linearGradient
          id={metalId}
          x1="90"
          y1="120"
          x2="310"
          y2="360"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor={shade.light} />
          <stop offset="0.45" stopColor={shade.mid} />
          <stop offset="0.7" stopColor={shade.dark} />
          <stop offset="1" stopColor={shade.mid} />
        </linearGradient>
        <radialGradient id={stoneId} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#eef3f7" />
          <stop offset="1" stopColor="#cfd8e0" />
        </radialGradient>
      </defs>

      <ellipse cx={CX} cy={366} rx={92} ry={8} fill="#000" opacity={0.07} />
      <path d={lower} fill="none" stroke={metal} strokeWidth={14} strokeLinecap="round" />
      {upperBand()}
      {sideStones()}
      {head()}
    </svg>
  );
}
