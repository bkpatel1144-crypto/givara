import type { SnapshotViews, ViewName } from "@/types/ring";
import { Rotate360Icon } from "./RingIcons";
import type { ViewerMode } from "./RingViewer";

const VIEWS: ViewName[] = ["front", "side", "top", "angle"];

export function RingThumbnails({
  views,
  mode,
  onSelect,
}: {
  views: SnapshotViews;
  mode: ViewerMode;
  onSelect: (m: ViewerMode) => void;
}) {
  return (
    <div className="thumb-rail" data-testid="preview-strip">
      <button
        type="button"
        onClick={() => onSelect("360")}
        className={`thumb thumb--label ${mode === "360" ? "thumb--selected" : ""}`}
      >
        <Rotate360Icon />
        <span>
          360°
          <br />
          view
        </span>
      </button>

      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(v)}
          aria-label={`${v} view`}
          className={`thumb ${mode === v ? "thumb--selected" : ""}`}
        >
          <img src={views[v]} alt={`${v} view`} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
