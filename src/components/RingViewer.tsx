import { useEffect, useMemo, useRef, useState } from "react";
import type { Metal, RingModelAssets, SnapshotViews, ViewName } from "@/types/ring";
import { ThreeRingViewer } from "./ThreeRingViewer";
import { Rotate360Icon } from "./RingIcons";

export type ViewerMode = "360" | ViewName;

const FRAME_ORDER: ViewName[] = ["front", "angle", "side", "top"];

export function RingViewer({
  views,
  models,
  mode,
  metal,
  onModeChange,
}: {
  views: SnapshotViews;
  models: RingModelAssets;
  mode: ViewerMode;
  metal: Metal;
  onModeChange: (m: ViewerMode) => void;
}) {
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [glbFailed, setGlbFailed] = useState(false);
  const [glbReady, setGlbReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const dragRef = useRef<{ x: number; frame: number; pointerId: number } | null>(null);

  useEffect(() => setLoading(true), [views.front, mode, frame]);
  useEffect(() => setFrame(0), [views.front]);
  useEffect(() => {
    setGlbFailed(false);
    setGlbReady(false);
  }, [models]);

  const src = useMemo(() => {
    if (mode === "360") {
      const view = FRAME_ORDER[frame % FRAME_ORDER.length] ?? "front";
      return views[view];
    }
    return views[mode];
  }, [mode, frame, views]);

  const onDown = (clientX: number, pointerId: number) => {
    if (mode !== "360") return;
    dragRef.current = { x: clientX, frame, pointerId };
  };
  const onMove = (clientX: number, pointerId: number) => {
    if (!dragRef.current || dragRef.current.pointerId !== pointerId) return;
    const delta = clientX - dragRef.current.x;
    const steps = Math.round(delta / 60);
    const next =
      (((dragRef.current.frame + steps) % FRAME_ORDER.length) + FRAME_ORDER.length) %
      FRAME_ORDER.length;
    if (next !== frame) setFrame(next);
  };
  const onUp = (pointerId: number) => {
    if (dragRef.current?.pointerId === pointerId) {
      dragRef.current = null;
    }
  };

  const isFailed = failed[src];

  return (
    <div
      className="viewer-stage"
      data-testid="ring-viewer"
      onPointerDown={(e) => {
        if (!glbFailed || mode !== "360") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown(e.clientX, e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!glbFailed) return;
        onMove(e.clientX, e.pointerId);
      }}
      onPointerUp={(e) => {
        if (!glbFailed) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        onUp(e.pointerId);
      }}
      onPointerCancel={(e) => {
        if (glbFailed) onUp(e.pointerId);
      }}
      style={{ cursor: glbFailed && mode === "360" ? "grab" : "default" }}
    >
      {!isFailed && (
        <img
          key={src}
          src={src}
          alt="Custom ring preview"
          loading="eager"
          draggable={false}
          className={`viewer-image viewer-poster ${glbReady ? "viewer-poster--hidden" : ""}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed((p) => ({ ...p, [src]: true }));
          }}
        />
      )}

      {!glbFailed && (
        <ThreeRingViewer
          assets={models}
          mode={mode}
          metal={metal}
          onError={() => setGlbFailed(true)}
          onLoaded={() => setGlbReady(true)}
        />
      )}

      {glbFailed && isFailed && (
        <div className="viewer-fallback">
          <Rotate360Icon size={28} />
          <p>Preview unavailable for this combination.</p>
          <span>Configuration and pricing remain fully usable.</span>
        </div>
      )}

      {mode === "360" && (
        <button type="button" className="drag-hint" onClick={() => onModeChange("360")}>
          <Rotate360Icon size={18} />
          Drag to rotate
        </button>
      )}
    </div>
  );
}
