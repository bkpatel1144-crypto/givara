import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_CONFIGURATION } from "@/data/ringOptions";
import type { RingConfiguration } from "@/types/ring";
import { parseConfigFromUrl, writeConfigToUrl } from "@/utils/urlState";
import { getRingAssets } from "@/api/snapshotAssets";
import { buildRingName } from "@/utils/buildRingName";

export function useRingConfiguration() {
  const [configuration, setConfigurationState] = useState<RingConfiguration>(DEFAULT_CONFIGURATION);
  const [isInitialized, setIsInitialized] = useState(false);

  // Read URL params after hydration only.
  useEffect(() => {
    const fromUrl = parseConfigFromUrl(window.location.search);
    if (Object.keys(fromUrl).length > 0) {
      setConfigurationState((prev) => ({ ...prev, ...fromUrl }));
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) writeConfigToUrl(configuration);
  }, [configuration, isInitialized]);

  const setConfiguration = useCallback((patch: Partial<RingConfiguration>) => {
    setConfigurationState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setConfigurationState(DEFAULT_CONFIGURATION);
  }, []);

  const assets = useMemo(() => getRingAssets(configuration), [configuration]);
  const title = useMemo(() => buildRingName(configuration), [configuration]);

  return { configuration, setConfiguration, reset, assets, title, isInitialized };
}
