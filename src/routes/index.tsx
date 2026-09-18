import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RingViewer, type ViewerMode } from "@/components/RingViewer";
import { RingThumbnails } from "@/components/RingThumbnails";
import { CartDrawer } from "@/components/CartDrawer";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CrownSettingSelector,
  DiamondShapeSelector,
  DiamondSizeSlider,
  MetalKaratAndSize,
  MetalSelector,
  RingStyleSelector,
  SideSettingSelector,
} from "@/components/Selectors";
import { useRingConfiguration } from "@/hooks/useRingConfiguration";
import { usePriceCalculation } from "@/hooks/usePriceCalculation";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/utils/formatCurrency";
import { BRAND_NAME } from "@/data/ringOptions";
import { DIAMOND_SHAPES, CARAT_STEPS } from "@/data/diamondOptions";
import { RING_STYLES, SIDE_SETTINGS, CROWN_SETTINGS } from "@/data/ringOptions";

const TITLE = "Custom Ring Studio | Givara Jewelry";
const DESCRIPTION =
  "Design your own engagement ring with Givara Jewelry: choose shape, carat, setting and metal with live pricing and a 360° preview.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RingBuilderPage,
});

function RingBuilderPage() {
  const { configuration, setConfiguration, assets, title } = useRingConfiguration();
  const { price, isLoading, error } = usePriceCalculation(configuration);
  const { items, removeItem, clear, count } = useCart();
  const [mode, setMode] = useState<ViewerMode>("360");
  const [cartOpen, setCartOpen] = useState(false);

  const selections = useMemo(
    () => ({
      Shape:
        DIAMOND_SHAPES.find((s) => s.value === configuration.diamondShape)?.label ??
        configuration.diamondShape,
      Carat:
        CARAT_STEPS.find((c) => c.value === configuration.centerDiamondSize)?.label ??
        configuration.centerDiamondSize,
      Style:
        RING_STYLES.find((s) => s.value === configuration.ringStyle)?.label ??
        configuration.ringStyle,
      Side:
        SIDE_SETTINGS.find((s) => s.value === configuration.sideSetting)?.label ??
        configuration.sideSetting,
      Crown:
        CROWN_SETTINGS.find((s) => s.value === configuration.crownSetting)?.label ??
        configuration.crownSetting,
      Metal: `${configuration.metalKarat.toUpperCase()} ${configuration.metal}`,
      Size: configuration.ringSize,
    }),
    [configuration],
  );

  const props = { configuration, set: setConfiguration };

  return (
    <div className="page">
      <SiteHeader cartCount={count} onOpenCart={() => setCartOpen(true)} />

      <main className="builder">
        <section className="builder__preview" aria-label="Ring preview">
          <div className="preview-sticky">
            <div className="preview-topline">
              <span>Givara / Bespoke 01</span>
              <span className="preview-live">
                <i aria-hidden />
                Live model
              </span>
            </div>
            <div className="preview-intro">
              <p className="preview-eyebrow">Designed by you</p>
              <h2>Made for always.</h2>
              <p>Shape every detail of a ring that feels entirely your own.</p>
            </div>
            <RingViewer
              views={assets.views}
              models={assets.models}
              mode={mode}
              metal={configuration.metal}
              onModeChange={setMode}
            />
            <div className="preview-trust">
              <span>01 / 04</span>
              <span>Real-time 3D</span>
              <span>Made to order</span>
            </div>
            <RingThumbnails views={assets.views} mode={mode} onSelect={setMode} />
          </div>
        </section>

        <section className="builder__panel" id="configuration" aria-label="Ring configuration">
          <div className="panel-content">
            <div className="builder-progress" aria-label="Design progress">
              <span className="builder-progress__number">01</span>
              <span className="builder-progress__line" aria-hidden />
              <span className="builder-progress__label">Create your ring</span>
              <span className="builder-progress__count">01 / 07</span>
            </div>
            <div className="panel-heading">
              <p className="panel-kicker">Build your ring</p>
              <h1 className="ring-title" data-testid="ring-title">
                {title}
              </h1>
              <p className="ring-description">
                A considered balance of light, proportion and precious metal.
              </p>
              <div className="selection-chips" aria-label="Current selections">
                <span>{selections.Shape}</span>
                <span>{selections.Carat}</span>
                <span>{selections.Metal}</span>
              </div>
              <p className="ring-sku">Design reference {assets.variantSku}</p>
            </div>
            <div className="live-total" aria-live="polite">
              <span>Live total</span>
              <strong>
                {price ? formatINR(price.total) : isLoading ? "Calculating…" : "Unavailable"}
              </strong>
              {error && <span className="live-total__error">Price unavailable</span>}
            </div>

            <div className="panel-options">
              <RingStyleSelector {...props} />
              <SideSettingSelector {...props} />
              <DiamondShapeSelector {...props} />
              <DiamondSizeSlider {...props} />
              <CrownSettingSelector {...props} />
              <MetalSelector {...props} />
              <MetalKaratAndSize {...props} />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          © {new Date().getFullYear()} {BRAND_NAME}. Handcrafted to order.
        </p>
      </footer>

      <CartDrawer
        open={cartOpen}
        items={items}
        onClose={() => setCartOpen(false)}
        onRemove={removeItem}
        onClear={clear}
      />
    </div>
  );
}
