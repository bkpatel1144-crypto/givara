import type { PriceData } from "@/types/pricing";
import { formatINR } from "@/utils/formatCurrency";

/**
 * The total and the commitment, pinned to the bottom of the configuration
 * column so neither is ever scrolled away from.
 */
export function ActionBar({
  price,
  isLoading,
  error,
  added,
  onOpenBreakup,
  onAddToCart,
}: {
  price: PriceData | null;
  isLoading: boolean;
  error: string | null;
  added: boolean;
  onOpenBreakup: () => void;
  onAddToCart: () => void;
}) {
  const total = price
    ? formatINR(price.total)
    : isLoading
      ? "Calculating…"
      : error
        ? "Unavailable"
        : "—";

  return (
    <div className="action-bar" data-testid="action-bar">
      <dl className="action-bar__total">
        <dt>Total</dt>
        <dd data-testid="total-price">{total}</dd>
        <button type="button" className="action-bar__break" onClick={onOpenBreakup}>
          View price breakup
        </button>
      </dl>
      <button
        type="button"
        className="btn btn--primary"
        onClick={onAddToCart}
        disabled={!price}
        data-testid="add-to-cart"
      >
        {added ? "Added to bag" : "Add to bag"}
      </button>
    </div>
  );
}
