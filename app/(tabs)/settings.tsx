import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useDownloadPolicy } from "../context/download-policy";

export default function SettingsScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [videoCount, setVideoCount] = useState(0);
  const [language, setLanguage] = useState<string | null>(null);
  const { wifiOnly, setWifiOnly } = useDownloadPolicy();
  const WIFI_POLICY_KEY = "download_wifi_only";

  const checkPermission = useCallback(async () => {
    try {
      setCheckingPermission(true);
      const { status } = await MediaLibrary.getPermissionsAsync();
      setHasPermission(status === "granted");
    } catch (error) {
      console.error("Error checking permission:", error);
      setHasPermission(false);
    } finally {
      setCheckingPermission(false);
    }
  }, []);

  const loadVideoCount = useCallback(async () => {
    try {
      const album = await MediaLibrary.getAlbumAsync("ssdown");
      if (album) {
        const assets = await MediaLibrary.getAssetsAsync({
          album: album,
          mediaType: MediaLibrary.MediaType.video,
          first: 1,
        });
        setVideoCount(assets.totalCount);
      } else {
        setVideoCount(0);
      }
    } catch (error) {
      console.error("Error loading video count:", error);
    }
  }, []);

  useEffect(() => {
    checkPermission();
    loadVideoCount();
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("app_language");
        if (stored) setLanguage(stored);
      } catch (error) {
        console.warn("Failed to load language:", error);
      }
    })();
    (async () => {
      try {
        const storedWifi = await AsyncStorage.getItem(WIFI_POLICY_KEY);
        if (storedWifi !== null) {
          setWifiOnly(storedWifi === "true");
        }
      } catch (error) {
        console.warn("Failed to load wifi policy:", error);
      }
    })();
  }, [checkPermission, loadVideoCount]);
  const handleWifiToggle = async (value: boolean) => {
    setWifiOnly(value);
    try {
      await AsyncStorage.setItem(WIFI_POLICY_KEY, value ? "true" : "false");
    } catch (error) {
      console.warn("Failed to save wifi policy:", error);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        Alert.alert("Success", "Storage permission granted.");
      } else {
        Alert.alert(
          "Permission needed",
          "Storage permission is required to save videos. Please allow it in settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      Alert.alert(
        "Error",
        "An error occurred while requesting permissions. Please try again."
      );
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  const openURL = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this URL.");
      }
    } catch (error) {
      console.error("Error opening URL:", error);
      Alert.alert("Error", "Failed to open URL.");
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showArrow = true,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <Pressable
      style={styles.settingItem}
      onPress={onPress}
      android_ripple={{ color: "#e3ebf5" }}
    >
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon as any} size={24} color="#1d8fff" />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        {subtitle && (
          <ThemedText style={styles.settingSubtitle}>{subtitle}</ThemedText>
        )}
      </View>
      {rightComponent ||
        (showArrow && onPress && (
          <MaterialIcons name="chevron-right" size={24} color="#9aa7b8" />
        ))}
    </Pressable>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Permission section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Permissions</ThemedText>
        <View style={styles.surface}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons
                name="folder-lock-outline"
                size={24}
                color="#1d8fff"
              />
            </View>
            <View style={styles.settingContent}>
              <ThemedText style={styles.settingTitle}>
                Storage permission
              </ThemedText>
              <ThemedText style={styles.settingSubtitle}>
                {checkingPermission
                  ? "Checking..."
                  : hasPermission
                  ? "Permission granted"
                  : "Permission required"}
              </ThemedText>
            </View>
            {checkingPermission ? (
              <ActivityIndicator size="small" color="#1d8fff" />
            ) : !hasPermission ? (
              <Pressable
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <ThemedText style={styles.permissionButtonText}>
                  Allow
                </ThemedText>
              </Pressable>
            ) : (
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color="#1eb980"
              />
            )}
          </View>
        </View>
      </View>

      {/* Storage section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Storage</ThemedText>
        <View style={styles.surface}>
          <SettingItem
            icon="video-outline"
            title="Downloaded videos"
            subtitle={`${videoCount} items`}
          />
          <SettingItem
            icon="folder-outline"
            title="Save location"
            subtitle="Gallery > ssdown album"
          />
        </View>
      </View>

      {/* Language section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Language</ThemedText>
        <View style={styles.surface}>
          <SettingItem
            icon="translate"
            title="Language"
            subtitle={language || "Select language"}
            onPress={() => router.push("/language")}
          />
        </View>
      </View>

      {/* Download policy */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Download policy</ThemedText>
        <View style={styles.surface}>
          <SettingItem
            icon="wifi"
            title="Download on Wi-Fi only"
            subtitle={
              wifiOnly
                ? "Downloads will start only on Wi-Fi"
                : "Allow downloads on any network"
            }
            rightComponent={
              <Switch
                value={wifiOnly}
                onValueChange={handleWifiToggle}
                trackColor={{ true: "#1eb980", false: "#cbd5e1" }}
                thumbColor={wifiOnly ? "#0f172a" : "#f8fafc"}
              />
            }
            showArrow={false}
          />
        </View>
      </View>

      {/* App info section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>App info</ThemedText>
        <View style={styles.surface}>
          <SettingItem
            icon="information-outline"
            title="App version"
            subtitle={Constants.expoConfig?.version || "1.0.0"}
          />
          <SettingItem
            icon="information"
            title="About"
            onPress={() => openURL("https://ssdown.app/about")}
          />
          <SettingItem
            icon="shield-check-outline"
            title="Privacy policy"
            onPress={() => openURL("https://ssdown.app/privacy")}
          />
          <SettingItem
            icon="email-outline"
            title="Contact"
            onPress={() => openURL("https://ssdown.app/contact")}
          />
        </View>
      </View>

      {/* Misc section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Misc</ThemedText>
        <View style={styles.surface}>
          <SettingItem
            icon="cog-outline"
            title="Open system settings"
            subtitle="Permissions and other settings"
            onPress={openSettings}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7a8699",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  surface: {
    backgroundColor: "#fdfefe",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#6aa8ff",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5fb",
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eef4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#7a8699",
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1d8fff",
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
