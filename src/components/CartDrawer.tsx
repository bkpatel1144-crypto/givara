import type { CartItem } from "@/types/ring";
import { formatINR } from "@/utils/formatCurrency";

/** Shares the sheet chrome with the price breakup, so the two read as one system. */
export function CartDrawer({
  open,
  items,
  onClose,
  onRemove,
  onClear,
}: {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (!open) return null;
  const total = items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

  return (
    <>
      <button type="button" className="scrim" aria-label="Close bag" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-label="Your bag">
        <div className="sheet__head">
          <h2>Your bag</h2>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="Close bag">
            ✕
          </button>
        </div>

        <div className="sheet__body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <p>Your bag is empty.</p>
              <span>Design a ring to get started.</span>
            </div>
          ) : (
            <ul className="drawer-list">
              {items.map((item) => (
                <li key={item.id}>
                  <p className="drawer-title">{item.title}</p>
                  <p className="drawer-meta">
                    {Object.entries(item.selections)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </p>
                  <p className="drawer-price">{formatINR(item.totalPrice)}</p>
                  <button
                    type="button"
                    className="price-retry"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.title}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="sheet__foot">
            <div className="drawer-total">
              <span>Total</span>
              <strong>{formatINR(total)}</strong>
            </div>
            <button type="button" className="btn btn--ghost" onClick={onClear}>
              Clear
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
