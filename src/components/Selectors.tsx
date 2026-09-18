import { CARAT_STEPS, DIAMOND_SHAPES } from "@/data/diamondOptions";
import { METALS } from "@/data/metalOptions";
import {
  CROWN_SETTINGS,
  METAL_KARATS,
  RING_SIZES,
  RING_STYLES,
  SIDE_SETTINGS,
} from "@/data/ringOptions";
import type { RingConfiguration } from "@/types/ring";
import { OptionCard, SectionLabel } from "./OptionCard";
import { CrownIcon, ShankIcon, ShapeIcon } from "./RingIcons";

type Props = {
  configuration: RingConfiguration;
  set: (patch: Partial<RingConfiguration>) => void;
};

export function RingStyleSelector({ configuration, set }: Props) {
  return (
    <section>
      <SectionLabel>Ring Style</SectionLabel>
      <div className="grid-3">
        {RING_STYLES.map((o) => (
          <OptionCard
            key={o.value}
            testId={`ring-style-${o.value}`}
            selected={configuration.ringStyle === o.value}
            onClick={() => set({ ringStyle: o.value })}
          >
            <ShankIcon kind={o.value} />
            <span>{o.label}</span>
          </OptionCard>
        ))}
      </div>
    </section>
  );
}

export function SideSettingSelector({ configuration, set }: Props) {
  return (
    <section>
      <SectionLabel>Side Setting</SectionLabel>
      <div className="grid-4">
        {SIDE_SETTINGS.map((o) => (
          <OptionCard
            key={o.value}
            testId={`side-setting-${o.value}`}
            selected={configuration.sideSetting === o.value}
            onClick={() => set({ sideSetting: o.value })}
          >
            <ShankIcon kind={o.value} />
            <span>{o.label}</span>
          </OptionCard>
        ))}
      </div>
    </section>
  );
}

export function DiamondShapeSelector({ configuration, set }: Props) {
  return (
    <section>
      <SectionLabel>Diamond Shape</SectionLabel>
      <div className="grid-3">
        {DIAMOND_SHAPES.map((o) => (
          <OptionCard
            key={o.value}
            testId={`diamond-shape-${o.value}`}
            selected={configuration.diamondShape === o.value}
            onClick={() => set({ diamondShape: o.value })}
          >
            <ShapeIcon shape={o.value} />
            <span>{o.label}</span>
          </OptionCard>
        ))}
      </div>
    </section>
  );
}

export function DiamondSizeSlider({ configuration, set }: Props) {
  const index = Math.max(
    0,
    CARAT_STEPS.findIndex((s) => s.value === configuration.centerDiamondSize),
  );
  return (
    <section>
      <SectionLabel>Center Diamond Size</SectionLabel>
      <input
        type="range"
        className="carat-slider"
        data-testid="carat-slider"
        min={0}
        max={CARAT_STEPS.length - 1}
        step={1}
        value={index}
        aria-label="Center diamond size"
        onChange={(e) => {
          const step = CARAT_STEPS[Number(e.target.value)];
          if (step) set({ centerDiamondSize: step.value });
        }}
      />
      <div className="carat-scale">
        {CARAT_STEPS.map((s, i) => (
          <button
            key={s.value}
            type="button"
            className={i === index ? "carat-tick carat-tick--active" : "carat-tick"}
            onClick={() => set({ centerDiamondSize: s.value })}
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function CrownSettingSelector({ configuration, set }: Props) {
  return (
    <section>
      <SectionLabel>Crown Setting</SectionLabel>
      <div className="grid-3">
        {CROWN_SETTINGS.map((o) => (
          <OptionCard
            key={o.value}
            testId={`crown-setting-${o.value}`}
            selected={configuration.crownSetting === o.value}
            onClick={() => set({ crownSetting: o.value })}
          >
            <CrownIcon kind={o.value} />
            <span>{o.label}</span>
          </OptionCard>
        ))}
      </div>
    </section>
  );
}

export function MetalSelector({ configuration, set }: Props) {
  return (
    <section>
      <SectionLabel>Metal</SectionLabel>
      <div className="grid-3">
        {METALS.map((o) => (
          <OptionCard
            key={o.value}
            testId={`metal-${o.value}`}
            selected={configuration.metal === o.value}
            onClick={() => set({ metal: o.value })}
          >
            <span className="metal-swatch" style={{ background: o.swatch }} />
            <span>{o.label}</span>
          </OptionCard>
        ))}
      </div>
    </section>
  );
}

export function MetalKaratAndSize({ configuration, set }: Props) {
  return (
    <section className="grid-2">
      <div>
        <SectionLabel>Metal Karat</SectionLabel>
        <select
          className="field-select"
          data-testid="metal-karat"
          value={configuration.metalKarat}
          onChange={(e) => set({ metalKarat: e.target.value as RingConfiguration["metalKarat"] })}
        >
          {METAL_KARATS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <SectionLabel>Ring Size</SectionLabel>
        <select
          className="field-select"
          data-testid="ring-size"
          value={configuration.ringSize}
          onChange={(e) => set({ ringSize: e.target.value })}
        >
          {RING_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
