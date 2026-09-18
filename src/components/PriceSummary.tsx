import type { PriceData } from "@/types/pricing";
import { formatDecimal, formatINR } from "@/utils/formatCurrency";

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`price-row ${muted ? "price-row--muted" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * The itemised breakdown, rows only.
 *
 * The total and the call to action live in the action bar, so this is just the
 * detail behind them and is rendered inside a sheet rather than inline — a
 * price this granular is something a shopper opens on purpose, not something
 * to make them scroll past on the way to choosing a shape.
 */
export function PriceBreakup({
  price,
  isLoading,
  error,
  onRetry,
}: {
  price: PriceData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (!price) {
    return (
      <div data-testid="price-breakup">
        <p className="price-note">
          {error
            ? "Live pricing is temporarily unreachable. Please retry in a moment."
            : isLoading
              ? "Calculating your price…"
              : "No price available yet."}
        </p>
        {error && (
          <button type="button" className="price-retry" onClick={onRetry}>
            Try live pricing again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="price-breakup" data-testid="price-breakup">
      <h4>Gold</h4>
      <Row label="Shank weight" value={`${formatDecimal(price.goldBreakup.shankWeight)} g`} muted />
      <Row label="Head weight" value={`${formatDecimal(price.goldBreakup.headWeight)} g`} muted />
      <Row label="Total weight" value={`${formatDecimal(price.goldBreakup.weight)} g`} muted />
      <Row label="Rate" value={`${formatINR(price.goldBreakup.rate)} / g`} muted />
      <Row label="Gold value" value={formatINR(price.goldBreakup.value)} />

      <h4>Diamonds</h4>
      {(
        [
          ["Center diamond", price.diamondBreakup.centerDiamond],
          ["Head side diamonds", price.diamondBreakup.headSideDiamond],
          ["Shank side diamonds", price.diamondBreakup.shankSideDiamond],
        ] as const
      )
        .filter(([, line]) => line && line.qty > 0)
        .map(([label, line]) => (
          <Row
            key={label}
            label={`${label} · ${line.qty} pc · ${formatDecimal(line.weight)} ct`}
            value={formatINR(line.price)}
          />
        ))}
      <Row label="Diamond value" value={formatINR(price.diamondBreakup.totalPrice)} />

      <h4>Making</h4>
      <Row label="Shank making" value={formatINR(price.makingCharges.shank)} muted />
      <Row label="Head making" value={formatINR(price.makingCharges.head)} muted />
      <Row label="Making charges" value={formatINR(price.makingCharges.total)} />

      <div className="price-divider" />
      <Row label="Subtotal" value={formatINR(price.subtotal)} />
      <Row label="GST" value={formatINR(price.gst)} />
      <Row label="Total" value={formatINR(price.total)} />

      <p className="price-note">Inclusive of GST. Prices update live with your configuration.</p>
    </div>
  );
}
