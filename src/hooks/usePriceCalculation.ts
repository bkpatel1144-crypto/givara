import { useCallback, useEffect, useRef, useState } from "react";
import { calculatePrice } from "@/api/origemApi";
import type { PriceData } from "@/types/pricing";
import type { RingConfiguration } from "@/types/ring";

const DEBOUNCE_MS = 350;

/** Only these fields affect the price API request. */
function priceKey(c: RingConfiguration) {
  return [
    c.diamondShape,
    c.centerDiamondSize,
    c.crownSetting,
    c.ringStyle,
    c.sideSetting,
    c.metalKarat,
    c.ringSize,
  ].join("|");
}

export function usePriceCalculation(configuration: RingConfiguration, enabled = true) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const [retryToken, setRetryToken] = useState(0);
  const key = priceKey(configuration);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(
      () => {
        calculatePrice(configuration, controller.signal)
          .then((data) => {
            if (id !== requestId.current) return; // stale
            setPrice(data);
            setIsLoading(false);
          })
          .catch((err: unknown) => {
            if (controller.signal.aborted || id !== requestId.current) return;
            setError(err instanceof Error ? err.message : "Price unavailable");
            setIsLoading(false);
          });
      },
      retryToken === 0 ? 0 : DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  return { price, isLoading, error, retry };
}
