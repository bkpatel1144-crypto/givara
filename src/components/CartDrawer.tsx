import type { CartItem } from "@/types/ring";
import { formatINR } from "@/utils/formatCurrency";

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
    <div className="drawer-root" role="dialog" aria-label="Your bag">
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer-panel">
        <header className="drawer-head">
          <h2>Your Bag</h2>
          <button type="button" onClick={onClose} aria-label="Close bag">
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <p className="drawer-empty">Your bag is empty. Design a ring to get started.</p>
        ) : (
          <>
            <ul className="drawer-list">
              {items.map((item) => (
                <li key={item.id}>
                  <img src={item.assets.front} alt="" loading="lazy" />
                  <div>
                    <p className="drawer-title">{item.title}</p>
                    <p className="drawer-meta">
                      {Object.entries(item.selections)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                    {item.engravingText && (
                      <p className="drawer-meta">Engraving: “{item.engravingText}”</p>
                    )}
                    <p className="drawer-price">{formatINR(item.totalPrice)}</p>
                  </div>
                  <button type="button" onClick={() => onRemove(item.id)} aria-label="Remove item">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <footer className="drawer-foot">
              <div className="drawer-total">
                <span>Total</span>
                <strong>{formatINR(total)}</strong>
              </div>
              <button type="button" className="btn btn--ghost" onClick={onClear}>
                Clear bag
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
