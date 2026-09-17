import { useEffect, useState } from "react";

/** Preloads snapshot URLs and reports which ones actually resolved. */
export function useRingAssets(urls: string[]) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    urls.forEach((url) => {
      if (!url) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setLoaded((p) => (p[url] ? p : { ...p, [url]: true }));
      };
      img.onerror = () => {
        if (!cancelled) setFailed((p) => (p[url] ? p : { ...p, [url]: true }));
      };
      img.src = url;
    });
    return () => {
      cancelled = true;
    };
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { loaded, failed };
}
