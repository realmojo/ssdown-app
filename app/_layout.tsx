import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as MediaLibrary from "expo-media-library";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Request permission on app launch
    requestInitialPermission();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <DownloadPolicyProvider>
        <SafeAreaView style={styles.container}>
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                // contentStyle: { backgroundColor: "#ffffff" },
              }}
            />
          </Stack>
        </SafeAreaView>
      </DownloadPolicyProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
