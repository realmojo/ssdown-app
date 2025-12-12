import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as MediaLibrary from "expo-media-library";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import {
  AdEventType,
  AppOpenAd,
  TestIds,
} from "react-native-google-mobile-ads";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocaleProvider, useLocale } from "./context/_locale";
import { DownloadPolicyProvider } from "./context/download-policy";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Initialize ssdown download folder (currently unused)
// async function initializeDownloadFolder() {
//   try {
//     const downloadDir = new Directory(Paths.document, "ssdown");
//     // Create the folder if missing (no-op if it already exists)
//     if (!downloadDir.exists) {
//       downloadDir.create({ intermediates: true, idempotent: true });
//     }
//   } catch (error) {
//     // Ignore if it already exists or fails to create
//     console.log("Download folder initialization:", error);
//   }
// }

// Request permission on app start
async function requestInitialPermission() {
  try {
    // Check current permission state
    const { status: currentStatus } = await MediaLibrary.getPermissionsAsync();

    // Early exit if already granted
    if (currentStatus === "granted") {
      return;
    }

    // Request permission if missing or denied
    const { status, canAskAgain } =
      await MediaLibrary.requestPermissionsAsync();

    if (status === "granted") {
      return;
    }

    // If denied at startup, stay quiet; downloads will re-request when needed
    if (!canAskAgain) {
      // Log only when permanently denied
      console.log("Permission permanently denied");
    }
  } catch (error) {
    console.error("Permission request error:", error);
  }
}

// App Open Ad configuration
const APP_OPEN_AD_UNIT_ID = __DEV__
  ? TestIds.APP_OPEN
  : Platform.OS === "ios"
  ? "ca-app-pub-9130836798889522/5218051479" // Replace with your iOS App Open Ad Unit ID
  : "ca-app-pub-9130836798889522/1741894792"; // Replace with your Android App Open Ad Unit ID

// Cooldown period: 10 minutes (in milliseconds)
const AD_COOLDOWN_PERIOD = 1000 * 60 * 10; // 10 minutes
const LAST_AD_SHOWN_KEY = "last_app_open_ad_shown";

// Check if enough time has passed since last ad
async function canShowAd(): Promise<boolean> {
  try {
    const lastShown = await AsyncStorage.getItem(LAST_AD_SHOWN_KEY);
    if (!lastShown) {
      return true; // Never shown before
    }
    const lastShownTime = parseInt(lastShown, 10);
    const now = Date.now();
    return now - lastShownTime >= AD_COOLDOWN_PERIOD;
  } catch (error) {
    console.warn("Error checking ad cooldown:", error);
    return true; // Default to showing ad if error
  }
}

// Save the time when ad was shown
async function saveAdShownTime() {
  try {
    await AsyncStorage.setItem(LAST_AD_SHOWN_KEY, Date.now().toString());
  } catch (error) {
    console.warn("Error saving ad shown time:", error);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appOpenAdRef = useRef<AppOpenAd | null>(null);
  const appState = useRef(AppState.currentState);
  const isFirstLaunch = useRef(true);
  const router = useRouter();
  const pathname = usePathname();
  const { language, loaded } = useLocale();

  // Language is now defaulted to "en", so no need to redirect to language selection
  // Users can manually navigate to /language from settings if they want to change it

  useEffect(() => {
    // Request permission on app launch
    requestInitialPermission();

    // Initialize App Open Ad
    const initAppOpenAd = async () => {
      try {
        const ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID, {
          requestNonPersonalizedAdsOnly: true,
        });

        // Show the ad when loaded (only if cooldown has passed)
        ad.addAdEventListener(AdEventType.LOADED, async () => {
          const canShow = await canShowAd();
          if (canShow) {
            ad.show();
            await saveAdShownTime();
          }
        });

        // Handle ad closed
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          // Load next ad for future use (but won't show until cooldown passes)
          ad.load();
        });

        // Load the ad on first launch
        const canShow = await canShowAd();
        if (canShow || isFirstLaunch.current) {
          await ad.load();
          isFirstLaunch.current = false;
        }

        appOpenAdRef.current = ad;
      } catch (error) {
        console.warn("App Open Ad initialization error:", error);
      }
    };

    initAppOpenAd();

    // Handle app state changes (when app comes to foreground)
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App has come to the foreground
          // Only show ad if enough time has passed since last ad
          const canShow = await canShowAd();
          if (appOpenAdRef.current && canShow) {
            // Load new ad when app comes to foreground (will show when loaded if cooldown passed)
            appOpenAdRef.current.load();
          }
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
      if (appOpenAdRef.current) {
        appOpenAdRef.current.removeAllListeners();
      }
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <LocaleProvider>
        <DownloadPolicyProvider>
          <SafeAreaView style={styles.container}>
            <Stack>
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="language"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
          </SafeAreaView>
        </DownloadPolicyProvider>
      </LocaleProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
