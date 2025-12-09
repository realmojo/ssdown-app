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

export const unstable_settings = {
  anchor: "(tabs)",
};

// ssdown 다운로드 폴더 초기화
// async function initializeDownloadFolder() {
//   try {
//     const downloadDir = new Directory(Paths.document, "ssdown");
//     // 폴더가 없으면 생성 (이미 있으면 무시됨)
//     if (!downloadDir.exists) {
//       downloadDir.create({ intermediates: true, idempotent: true });
//     }
//   } catch (error) {
//     // 폴더가 이미 존재하거나 생성 실패 시 무시
//     console.log("Download folder initialization:", error);
//   }
// }

// 앱 시작 시 권한 요청
async function requestInitialPermission() {
  try {
    // 현재 권한 상태 확인
    const { status: currentStatus } = await MediaLibrary.getPermissionsAsync();

    // 이미 권한이 있으면 종료
    if (currentStatus === "granted") {
      return;
    }

    // 권한이 없거나 거부된 경우 요청
    const { status, canAskAgain } =
      await MediaLibrary.requestPermissionsAsync();

    if (status === "granted") {
      return;
    }

    // 권한이 거부된 경우 (앱 시작 시에는 조용히 처리, 사용자가 다운로드 시 다시 요청 가능)
    if (!canAskAgain) {
      // 영구적으로 거부된 경우에만 나중에 안내
      console.log("Permission permanently denied");
    }
  } catch (error) {
    console.error("Permission request error:", error);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // 앱 시작 시 권한 요청
    requestInitialPermission();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
