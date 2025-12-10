import * as FileSystem from "expo-file-system";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type DownloadPolicyContextValue = {
  wifiOnly: boolean;
  setWifiOnly: (value: boolean) => void;
  loaded: boolean;
};

const DownloadPolicyContext = createContext<DownloadPolicyContextValue>({
  wifiOnly: false,
  setWifiOnly: () => {},
  loaded: false,
});

const SETTINGS_PATH = `${FileSystem.documentDirectory ?? ""}settings.json`;

export function DownloadPolicyProvider({ children }: { children: ReactNode }) {
  const [wifiOnly, setWifiOnlyState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!SETTINGS_PATH) return;
        const info = await FileSystem.getInfoAsync(SETTINGS_PATH);
        if (info.exists) {
          const data = await FileSystem.readAsStringAsync(SETTINGS_PATH);
          const parsed = JSON.parse(data);
          if (!cancelled && typeof parsed?.wifiOnly === "boolean") {
            setWifiOnlyState(parsed.wifiOnly);
          }
        }
      } catch (error) {
        console.warn("Failed to load settings:", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setWifiOnly = (value: boolean) => {
    setWifiOnlyState(value);
    // Fire and forget persist
    if (SETTINGS_PATH) {
      FileSystem.writeAsStringAsync(
        SETTINGS_PATH,
        JSON.stringify({ wifiOnly: value })
      ).catch((error) => {
        console.warn("Failed to persist settings:", error);
      });
    }
  };

  const value = useMemo(
    () => ({
      wifiOnly,
      setWifiOnly,
      loaded,
    }),
    [wifiOnly, loaded]
  );

  return (
    <DownloadPolicyContext.Provider value={value}>
      {children}
    </DownloadPolicyContext.Provider>
  );
}

export function useDownloadPolicy() {
  return useContext(DownloadPolicyContext);
}
