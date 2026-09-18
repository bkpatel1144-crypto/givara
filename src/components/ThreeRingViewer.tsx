import { useEffect, useMemo, useRef, useState } from "react";
import type { Metal, RingModelAssets, ViewName } from "@/types/ring";

export type ViewerMode = "360" | ViewName;

/**
 * React shell around the three.js scene in src/three/RingRenderer.ts.
 *
 * The renderer is created once and then *told* about changes — it is never
 * rebuilt for a new metal or view. three.js is pulled in with a dynamic import
 * so it stays out of the SSR bundle and off the critical path; the poster image
 * underneath covers the gap.
 */
export function ThreeRingViewer({
  assets,
  mode,
  metal,
  onError,
  onLoaded,
}: {
  assets: RingModelAssets;
  mode: ViewerMode;
  metal: Metal;
  onError: () => void;
  onLoaded: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Imported lazily, so the type has to come from the module itself.
  const rendererRef = useRef<import("@/three/RingRenderer").RingRenderer | null>(null);
  const [ready, setReady] = useState(false);

  // Callbacks are inline arrows at the call site, so a new identity arrives on
  // every parent render. Holding them in refs keeps them out of effect deps,
  // which would otherwise tear the WebGL context down and rebuild it.
  const onErrorRef = useRef(onError);
  const onLoadedRef = useRef(onLoaded);
  onErrorRef.current = onError;
  onLoadedRef.current = onLoaded;

  // Identity for the set of parts, so a re-render with an equivalent assets
  // object does not trigger a reload.
  const partsKey = useMemo(
    () =>
      [
        assets.bandPath,
        assets.headPath,
        assets.diamondPath,
        assets.bandDiamondPath,
        assets.headDiamondPath,
      ].join("|"),
    [assets],
  );

  // Create the renderer once, and tear it down on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    void (async () => {
      try {
        const { RingRenderer } = await import("@/three/RingRenderer");
        if (cancelled) return;
        // Async: the HDRI environments have to be fetched before anything can
        // be lit or traced.
        const renderer = await RingRenderer.create(container, metal);
        if (cancelled) {
          renderer.dispose();
          return;
        }
        rendererRef.current = renderer;
      } catch (error) {
        // No WebGL, a lost context, or a chunk that failed to load. The parent
        // falls back to the CloudFront stills, which is a fine outcome.
        if (!cancelled) onErrorRef.current();
      }
    })();

    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // Deliberately empty: `metal` is only the initial value here and every later
    // change is pushed through setMetal below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load / swap the model.
  useEffect(() => {
    let cancelled = false;
    setReady(false);

    void (async () => {
      // The renderer is created by an async effect that may not have resolved
      // yet on the first pass; wait for it rather than dropping the load.
      const renderer = await waitForRenderer(rendererRef, () => cancelled);
      if (!renderer || cancelled) return;
      try {
        const { ringPartSources } = await import("@/three/ringGeometry");
        await renderer.setParts(ringPartSources(assets));
        if (cancelled) return;
        setReady(true);
        onLoadedRef.current();
      } catch (error) {
        if (!cancelled) onErrorRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partsKey, assets]);

  useEffect(() => {
    rendererRef.current?.setMetal(metal);
  }, [metal, ready]);

  useEffect(() => {
    rendererRef.current?.setMode(mode);
  }, [mode, ready]);

  // Idle the render loop when the viewer is offscreen or the tab is hidden.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let visible = true;
    let onscreen = true;
    const sync = () => rendererRef.current?.setRunning(visible && onscreen);

    const observer = new IntersectionObserver(([entry]) => {
      onscreen = entry?.isIntersecting ?? true;
      sync();
    });
    observer.observe(container);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="glb-viewer-shell">
      {!ready && (
        <div className="glb-status" aria-live="polite">
          <span className="glb-status__dot" aria-hidden />
          <span>Loading interactive preview</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={`glb-canvas ${ready ? "glb-canvas--ready" : ""}`}
        role="img"
        aria-label="Interactive custom ring 3D preview"
      />
    </div>
  );
}

/** Poll briefly for the renderer created by the mount effect. */
async function waitForRenderer(
  ref: React.RefObject<import("@/three/RingRenderer").RingRenderer | null>,
  isCancelled: () => boolean,
): Promise<import("@/three/RingRenderer").RingRenderer | null> {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (isCancelled()) return null;
    if (ref.current) return ref.current;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}
