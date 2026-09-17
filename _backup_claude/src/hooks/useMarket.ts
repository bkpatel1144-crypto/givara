import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MARKET_ID, MARKETS, isMarketId, type MarketId } from "@/config/markets";

const STORAGE_KEY = "givara.ring-builder.market";
const URL_PARAM = "market";

/**
 * The shopper's market (currency, tax, size system).
 * Priority: ?market= in the URL → last choice in localStorage → VITE_DEFAULT_MARKET.
 */
export function useMarket() {
  const [marketId, setMarketIdState] = useState<MarketId>(DEFAULT_MARKET_ID);

  // Read after hydration so server and client render the same first frame.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM)?.toUpperCase();
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    if (isMarketId(fromUrl)) setMarketIdState(fromUrl);
    else if (isMarketId(stored)) setMarketIdState(stored);
  }, []);

  const setMarketId = useCallback((id: MarketId) => {
    setMarketIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable */
    }
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, id);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  return { market: MARKETS[marketId], setMarketId };
}
