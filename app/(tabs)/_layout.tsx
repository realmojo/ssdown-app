import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
// Android: ca-app-pub-9130836798889522/7917853154
// iOS: ca-app-pub-9130836798889522/9641890567

{
  /* BANNER = 'BANNER',
  // FULL_BANNER = 'FULL_BANNER',
  // LARGE_BANNER = 'LARGE_BANNER',
  // LEADERBOARD = 'LEADERBOARD',
  // MEDIUM_RECTANGLE = 'MEDIUM_RECTANGLE',
  // ADAPTIVE_BANNER = 'ADAPTIVE_BANNER',
  // ANCHORED_ADAPTIVE_BANNER = 'ANCHORED_ADAPTIVE_BANNER',
  // INLINE_ADAPTIVE_BANNER = 'INLINE_ADAPTIVE_BANNER',
  // WIDE_SKYSCRAPER = 'WIDE_SKYSCRAPER',
  */
}

const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === "ios"
  ? "ca-app-pub-9130836798889522/9641890567"
  : "ca-app-pub-9130836798889522/7917853154";

const BANNER_HEIGHT = 60;

const BannerAdComponent = () => {
  return (
    Platform.OS !== "web" &&
    BannerAd &&
    BannerAdSize && (
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.FULL_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.error("Ad failed to load:", error);
        }}
      />
    )
  );
};
export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#f5d76e", // active accent
          tabBarInactiveTintColor: "rgba(255,255,255,0.64)",
          tabBarStyle: {
            backgroundColor: "#0f172a",
            borderTopWidth: 1,
            borderTopColor: "#1f2937",
            paddingTop: 4,
            paddingBottom: Platform.OS === "android" ? 0 : 8, // keep above Android nav buttons
            height: BANNER_HEIGHT,
          },
          sceneStyle: {
            paddingBottom: BANNER_HEIGHT,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: "Downloads",
            tabBarIcon: ({ color }) => (
              <IconSymbol
                size={24}
                name="arrow.down.circle.fill"
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="gearshape.fill" color={color} />
            ),
          }}
        />
      </Tabs>
      <View style={[styles.bannerContainer, { height: BANNER_HEIGHT }]}>
        <BannerAdComponent />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 56, // place above tab bar
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
});
