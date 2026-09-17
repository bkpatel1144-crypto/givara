/** Lightweight line-art icons matching the reference option cards. */
const A = "#AB5926";

export function ShankIcon({ kind }: { kind: string }) {
  const band = (d: string) => (
    <path d={d} stroke={A} strokeWidth="3" strokeLinecap="round" fill="none" />
  );
  return (
    <svg width="72" height="28" viewBox="0 0 72 28" aria-hidden>
      {kind === "twist" && band("M6 20 C22 20 26 8 36 14 C46 20 50 8 66 8")}
      {kind === "split" && (
        <>
          {band("M6 10 C20 10 26 13 36 14")}
          {band("M6 18 C20 18 26 15 36 14")}
          {band("M36 14 C46 13 52 10 66 10")}
          {band("M36 14 C46 15 52 18 66 18")}
        </>
      )}
      {kind === "two-row-split" && (
        <>
          {band("M6 9 C20 9 28 12 36 14")}
          {band("M6 19 C20 19 28 16 36 14")}
          {band("M36 14 C44 12 52 9 66 9")}
          {band("M36 14 C44 16 52 19 66 19")}
          {band("M12 14 H26")}
          {band("M46 14 H60")}
        </>
      )}
      {kind === "pinch" && band("M6 8 C20 8 26 14 36 14 C46 14 52 8 66 8")}
      {kind === "cathedral-straight" && band("M6 18 C20 18 26 10 36 10 C46 10 52 18 66 18")}
      {(kind === "classic-straight" || kind === "plain-gold") && band("M6 14 H66")}
      {kind === "pave" && (
        <>
          {band("M6 14 H66")}
          {[10, 17, 24, 48, 55, 62].map((x) => (
            <circle key={x} cx={x} cy={14} r="2.6" fill="none" stroke={A} strokeWidth="1.2" />
          ))}
        </>
      )}
      {kind === "prong" && (
        <>
          {band("M6 14 H66")}
          {[10, 18, 26, 46, 54, 62].map((x) => (
            <path
              key={x}
              d={`M${x - 3} 10 L${x + 3} 18 M${x - 3} 18 L${x + 3} 10`}
              stroke={A}
              strokeWidth="1.2"
            />
          ))}
        </>
      )}
      {kind === "channel" && (
        <>
          {band("M6 14 H66")}
          <rect x="8" y="10" width="20" height="8" fill="none" stroke={A} strokeWidth="1.2" />
          <rect x="44" y="10" width="20" height="8" fill="none" stroke={A} strokeWidth="1.2" />
        </>
      )}
      <g>
        <circle cx="36" cy="14" r="6" fill="none" stroke={A} strokeWidth="1.4" />
        <path d="M30 14 H42 M36 8 L31 14 L36 20 L41 14 Z" stroke={A} strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}

export function CrownIcon({ kind }: { kind: string }) {
  return (
    <svg width="72" height="28" viewBox="0 0 72 28" aria-hidden>
      <path d="M6 16 H66" stroke={A} strokeWidth="3" strokeLinecap="round" />
      {kind === "single-halo" && (
        <circle
          cx="36"
          cy="13"
          r="10"
          fill="none"
          stroke={A}
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
      )}
      {kind === "hidden-halo" && (
        <ellipse
          cx="36"
          cy="18"
          rx="9"
          ry="3.5"
          fill="none"
          stroke={A}
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
      )}
      <circle cx="36" cy="13" r="6.5" fill="none" stroke={A} strokeWidth="1.4" />
      <path
        d="M29.5 13 H42.5 M36 6.5 L30.5 13 L36 19.5 L41.5 13 Z"
        stroke={A}
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

export function ShapeIcon({ shape }: { shape: string }) {
  const s = { fill: "none", stroke: A, strokeWidth: 1.3 } as const;
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden>
      {shape === "round" && (
        <>
          <circle cx="27" cy="27" r="19" {...s} />
          <circle cx="27" cy="27" r="11" {...s} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={27 + 11 * Math.cos(a)}
                y1={27 + 11 * Math.sin(a)}
                x2={27 + 19 * Math.cos(a)}
                y2={27 + 19 * Math.sin(a)}
                {...s}
              />
            );
          })}
        </>
      )}
      {shape === "princess" && (
        <>
          <rect x="8" y="8" width="38" height="38" {...s} />
          <rect x="17" y="17" width="20" height="20" {...s} />
          <path d="M8 8 L17 17 M46 8 L37 17 M8 46 L17 37 M46 46 L37 37" {...s} />
        </>
      )}
      {shape === "oval" && (
        <>
          <ellipse cx="27" cy="27" rx="13" ry="20" {...s} />
          <ellipse cx="27" cy="27" rx="7" ry="12" {...s} />
          <path d="M27 7 V15 M27 39 V47 M14 27 H20 M34 27 H40" {...s} />
        </>
      )}
      {shape === "pear" && (
        <>
          <path d="M27 6 C36 20 42 28 42 34 A15 15 0 0 1 12 34 C12 28 18 20 27 6 Z" {...s} />
          <path d="M27 16 C33 26 36 30 36 34 A9 9 0 0 1 18 34 C18 30 21 26 27 16 Z" {...s} />
        </>
      )}
      {shape === "emerald" && (
        <>
          <path d="M16 8 H38 L46 16 V38 L38 46 H16 L8 38 V16 Z" {...s} />
          <path d="M19 15 H35 L39 19 V35 L35 39 H19 L15 35 V19 Z" {...s} />
        </>
      )}
      {shape === "radiant" && (
        <>
          <path d="M16 8 H38 L46 16 V38 L38 46 H16 L8 38 V16 Z" {...s} />
          <path d="M20 16 H34 L38 20 V34 L34 38 H20 L16 34 V20 Z" {...s} />
          <path d="M16 8 L20 16 M38 8 L34 16 M8 38 L16 34 M46 38 L38 34" {...s} />
        </>
      )}
      {shape === "marquise" && (
        <>
          <path
            d="M27 5 C36 15 40 22 40 27 C40 32 36 39 27 49 C18 39 14 32 14 27 C14 22 18 15 27 5 Z"
            {...s}
          />
          <path
            d="M27 14 C32 21 34 24 34 27 C34 30 32 33 27 40 C22 33 20 30 20 27 C20 24 22 21 27 14 Z"
            {...s}
          />
        </>
      )}
      {shape === "heart" && (
        <>
          <path
            d="M27 46 C10 34 8 24 8 19 A11 11 0 0 1 27 13 A11 11 0 0 1 46 19 C46 24 44 34 27 46 Z"
            {...s}
          />
          <path
            d="M27 36 C17 29 15 24 15 21 A6 6 0 0 1 27 20 A6 6 0 0 1 39 21 C39 24 37 29 27 36 Z"
            {...s}
          />
        </>
      )}
      {shape === "elongated-cushion" && (
        <>
          <path d="M18 8 H36 Q46 8 46 18 V36 Q46 46 36 46 H18 Q8 46 8 36 V18 Q8 8 18 8 Z" {...s} />
          <path
            d="M20 16 H34 Q38 16 38 20 V34 Q38 38 34 38 H20 Q16 38 16 34 V20 Q16 16 20 16 Z"
            {...s}
          />
        </>
      )}
    </svg>
  );
}

export function Rotate360Icon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66"
        stroke="#AB5926"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20 3v5h-5"
        stroke="#AB5926"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
