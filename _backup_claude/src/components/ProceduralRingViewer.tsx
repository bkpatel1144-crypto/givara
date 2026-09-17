import { useEffect, useRef } from "react";
import type { RingConfiguration } from "@/types/ring";
import type { RingStudio } from "@/three/ringStudio";
import type { ViewerMode } from "./RingViewer";

/**
 * Real-time 3D ring generated from the configuration (no model files needed).
 * Three.js is loaded on the client only, after hydration.
 */
export function ProceduralRingViewer({
  configuration,
  mode,
  onReady,
  onError,
}: {
  configuration: RingConfiguration;
  mode: ViewerMode;
  onReady: () => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<RingStudio | null>(null);
  const latest = useRef({ configuration, mode, onReady, onError });
  useEffect(() => {
    latest.current = { configuration, mode, onReady, onError };
  });

  useEffect(() => {
    let disposed = false;
    import("@/three/ringStudio")
      .then(({ createRingStudio }) => {
        if (disposed || !containerRef.current) return;
        const studio = createRingStudio(containerRef.current);
        studioRef.current = studio;
        studio.setConfiguration(latest.current.configuration);
        studio.setView(latest.current.mode);
        latest.current.onReady();
      })
      .catch((error: unknown) => {
        console.error("3D ring preview unavailable", error);
        if (!disposed) latest.current.onError();
      });
    return () => {
      disposed = true;
      studioRef.current?.dispose();
      studioRef.current = null;
    };
  }, []);

  const { ringStyle, sideSetting, crownSetting, diamondShape, centerDiamondSize, ringSize, metal } =
    configuration;

  useEffect(() => {
    studioRef.current?.setConfiguration({
      ringStyle,
      sideSetting,
      crownSetting,
      diamondShape,
      centerDiamondSize,
      ringSize,
      metal,
    });
  }, [ringStyle, sideSetting, crownSetting, diamondShape, centerDiamondSize, ringSize, metal]);

  useEffect(() => {
    studioRef.current?.setView(mode);
  }, [mode]);

  return <div ref={containerRef} className="procedural-viewer" />;
}
