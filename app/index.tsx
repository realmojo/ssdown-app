import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const LANGUAGE_KEY = "app_language";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (!cancelled && stored) {
          setLanguage(stored);
        }
      } catch (error) {
        console.warn("Failed to read language preference:", error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <ActivityIndicator size="small" color="#f5d76e" />
      </View>
    );
  }

  if (!language) {
    return <Redirect href="/language" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
