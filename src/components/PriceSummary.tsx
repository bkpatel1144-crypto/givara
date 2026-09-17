import { useState } from "react";
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

export function PriceSummary({
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
  const [open, setOpen] = useState(false);

  return (
    <div className="price-card" data-testid="price-summary">
      <div className="price-total">
        <span>Total Price</span>
        <strong data-testid="total-price">
          {isLoading && !price ? (
            <span className="price-loading" aria-label="Calculating price">
              Calculating…
            </span>
          ) : error && !price ? (
            "Unavailable"
          ) : (
            formatINR(price?.total ?? null)
          )}
        </strong>
      </div>
      <p className="price-note">
        {error && !price
          ? "Live pricing is temporarily unreachable. Please retry in a moment."
          : isLoading
            ? "Updating price for your new configuration…"
            : "Inclusive of 3% GST. Prices update live with your configuration."}
      </p>

      {error && !price && (
        <button type="button" className="price-retry" onClick={onRetry}>
          Try live pricing again
        </button>
      )}

      {price && (
        <>
          <button
            type="button"
            className="price-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide price breakup" : "View price breakup"}
          </button>

          {open && (
            <div className="price-breakup" data-testid="price-breakup">
              <h4>Gold</h4>
              <Row
                label="Shank weight"
                value={`${formatDecimal(price.goldBreakup.shankWeight)} g`}
                muted
              />
              <Row
                label="Head weight"
                value={`${formatDecimal(price.goldBreakup.headWeight)} g`}
                muted
              />
              <Row
                label="Total weight"
                value={`${formatDecimal(price.goldBreakup.weight)} g`}
                muted
              />
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
