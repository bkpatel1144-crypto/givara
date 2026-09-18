import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { RingViewer, type ViewerMode } from "@/components/RingViewer";
import { RingThumbnails } from "@/components/RingThumbnails";
import { CartDrawer } from "@/components/CartDrawer";
import { SiteHeader } from "@/components/SiteHeader";
import { ActionBar } from "@/components/ActionBar";
import { PriceBreakup } from "@/components/PriceSummary";
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
  const { configuration, assets, setConfiguration, title } = useRingConfiguration();
  const { price, isLoading, error, retry } = usePriceCalculation(configuration);
  const { items, addItem, removeItem, clear, count } = useCart();
  const [mode, setMode] = useState<ViewerMode>("360");
  const [cartOpen, setCartOpen] = useState(false);
  const [breakupOpen, setBreakupOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const label = useCallback(
    (list: readonly { value: string; label: string }[], value: string) =>
      list.find((o) => o.value === value)?.label ?? value,
    [],
  );

  const selections = useMemo(
    () => ({
      Shape: label(DIAMOND_SHAPES, configuration.diamondShape),
      Carat: label(CARAT_STEPS, configuration.centerDiamondSize),
      Style: label(RING_STYLES, configuration.ringStyle),
      Side: label(SIDE_SETTINGS, configuration.sideSetting),
      Crown: label(CROWN_SETTINGS, configuration.crownSetting),
      Metal: `${configuration.metalKarat.toUpperCase()} ${configuration.metal}`,
      Size: configuration.ringSize,
    }),
    [configuration, label],
  );

  const onAddToCart = useCallback(() => {
    addItem({
      title,
      configuration,
      selections,
      totalPrice: price?.total ?? null,
      priceBreakup: price,
      assets: assets.views,
    });
    setAdded(true);
    setCartOpen(true);
    window.setTimeout(() => setAdded(false), 2400);
  }, [addItem, title, configuration, selections, price, assets.views]);

  const props = { configuration, set: setConfiguration };

  return (
    <div className="studio">
      <SiteHeader cartCount={count} onOpenCart={() => setCartOpen(true)} />

      <main className="studio__body">
        <section className="stage" aria-label="Ring preview">
          <div className="stage__inner">
            <div className="stage__frame">
              <RingViewer
                views={assets.views}
                models={assets.models}
                mode={mode}
                metal={configuration.metal}
                onModeChange={setMode}
              />
            </div>
          </div>
          {/* Sibling of the stage, not a child of it: on desktop this is pinned
              beside the ring, on mobile it flows underneath. */}
          <RingThumbnails views={assets.views} mode={mode} onSelect={setMode} />
          <div className="stage__foot">
            <span>Real-time 3D</span>
            <i aria-hidden />
            <span>Made to order</span>
            <i aria-hidden />
            <span>{assets.variantSku}</span>
          </div>
        </section>

        <section className="config" id="configuration" aria-label="Ring configuration">
          <div className="config__scroll">
            <header className="config__head">
              <p className="eyebrow">Bespoke · Design your own</p>
              <h1 className="config__title" data-testid="ring-title">
                {title}
              </h1>
              <p className="config__sub">
                A considered balance of light, proportion and precious metal — shaped entirely by
                you.
              </p>
              <ul className="spec" aria-label="Current selections">
                <li>{selections.Shape}</li>
                <li>{selections.Carat}</li>
                <li>{selections.Metal}</li>
                <li>Size {selections.Size}</li>
              </ul>
            </header>

            <div className="config__sections">
              <RingStyleSelector {...props} />
              <SideSettingSelector {...props} />
              <DiamondShapeSelector {...props} />
              <DiamondSizeSlider {...props} />
              <CrownSettingSelector {...props} />
              <MetalSelector {...props} />
              <MetalKaratAndSize {...props} />
            </div>
          </div>

          <ActionBar
            price={price}
            isLoading={isLoading}
            error={error}
            added={added}
            onOpenBreakup={() => setBreakupOpen(true)}
            onAddToCart={onAddToCart}
          />
        </section>
      </main>

      {breakupOpen && (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="Close price breakup"
            onClick={() => setBreakupOpen(false)}
          />
          <aside className="sheet" role="dialog" aria-label="Price breakup">
            <div className="sheet__head">
              <h2>Price breakup</h2>
              <button
                type="button"
                className="sheet__close"
                onClick={() => setBreakupOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="sheet__body">
              <PriceBreakup price={price} isLoading={isLoading} error={error} onRetry={retry} />
            </div>
          </aside>
        </>
      )}

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
