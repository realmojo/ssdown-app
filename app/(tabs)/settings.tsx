import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useDownloadPolicy } from "../context/download-policy";
import { useLocale } from "../context/locale";

export default function SettingsScreen() {
  const { t, language } = useLocale();
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [videoCount, setVideoCount] = useState(0);
  const { wifiOnly, setWifiOnly } = useDownloadPolicy();
  const WIFI_POLICY_KEY = "download_wifi_only";
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });
  const showInfoModal = (title: string, message: string) =>
    setInfoModal({ visible: true, title, message });
  const showActionModal = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }) =>
    setActionModal({
      visible: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? "Open settings",
      cancelLabel: options.cancelLabel ?? "Cancel",
      onConfirm: options.onConfirm,
    });
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }>({ visible: false, title: "", message: "" });

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
        setSuccessModal({
          visible: true,
          title: "Success",
          message: "Storage permission granted.",
        });
      } else {
        showActionModal({
          title: "Permission needed",
          message:
            "Storage permission is required to save videos. Please allow it in settings.",
          confirmLabel: "Open settings",
          cancelLabel: "Cancel",
          onConfirm: () => Linking.openSettings(),
        });
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      showInfoModal(
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
        showInfoModal("Error", "Cannot open this URL.");
      }
    } catch (error) {
      console.error("Error opening URL:", error);
      showInfoModal("Error", "Failed to open URL.");
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
    <>
      <Modal
        visible={infoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setInfoModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="information-outline"
                size={36}
                color="#0ea5e9"
              />
            </View>
            <ThemedText style={styles.modalTitle}>{infoModal.title}</ThemedText>
            <ThemedText style={styles.modalMessage}>
              {infoModal.message}
            </ThemedText>
            <Pressable
              style={styles.modalButton}
              onPress={() =>
                setInfoModal((prev) => ({ ...prev, visible: false }))
              }
              android_ripple={{ color: "#cbd5e1" }}
            >
              <ThemedText style={styles.modalButtonText}>OK</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setActionModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={36}
                color="#f97316"
              />
            </View>
            <ThemedText style={styles.modalTitle}>
              {actionModal.title}
            </ThemedText>
            <ThemedText style={styles.modalMessage}>
              {actionModal.message}
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() =>
                  setActionModal((prev) => ({ ...prev, visible: false }))
                }
                android_ripple={{ color: "#e3ebf5" }}
              >
                <ThemedText
                  style={[styles.modalButtonText, { color: "#0f172a" }]}
                >
                  {actionModal.cancelLabel || "Cancel"}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonDestructive]}
                onPress={() => {
                  const onConfirm = actionModal.onConfirm;
                  setActionModal((prev) => ({ ...prev, visible: false }));
                  onConfirm?.();
                }}
                android_ripple={{ color: "#fee2e2" }}
              >
                <ThemedText style={styles.modalButtonText}>
                  {actionModal.confirmLabel || "OK"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSuccessModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="check-circle"
                size={36}
                color="#22c55e"
              />
            </View>
            <ThemedText style={styles.modalTitle}>
              {successModal.title}
            </ThemedText>
            <ThemedText style={styles.modalMessage}>
              {successModal.message}
            </ThemedText>
            <Pressable
              style={styles.modalButton}
              onPress={() =>
                setSuccessModal((prev) => ({ ...prev, visible: false }))
              }
              android_ripple={{ color: "#cbd5e1" }}
            >
              <ThemedText style={styles.modalButtonText}>OK</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {t("settings.permissions")}
          </ThemedText>
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
                  {t("settings.storagePermission")}
                </ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  {checkingPermission
                    ? t("settings.checking")
                    : hasPermission
                    ? t("settings.permissionGranted")
                    : t("settings.permissionRequired")}
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
                    {t("common.allow")}
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
        {/* <View style={styles.section}>
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
      </View> */}

        {/* Language section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {t("settings.language")}
          </ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="translate"
              title={t("settings.language")}
              subtitle={t("settings.selectedLanguage")}
              onPress={() => router.push("/language")}
            />
          </View>
        </View>

        {/* Download policy */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {t("settings.downloadPolicy")}
          </ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="wifi"
              title={t("settings.wifiOnlyTitle")}
              subtitle={
                wifiOnly ? t("settings.wifiOnlyOn") : t("settings.wifiOnlyOff")
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
          <ThemedText style={styles.sectionTitle}>
            {t("settings.appInfo")}
          </ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="information-outline"
              title={t("settings.appVersion")}
              subtitle={Constants.expoConfig?.version || "1.0.0"}
              onPress={() =>
                openURL(
                  "https://play.google.com/store/apps/details?id=com.mojoday.ssdown"
                )
              }
            />
            <SettingItem
              icon="information"
              title={t("settings.about")}
              onPress={() => openURL("https://ssdown.app/about")}
            />
            <SettingItem
              icon="shield-check-outline"
              title={t("settings.privacy")}
              onPress={() => openURL("https://ssdown.app/privacy")}
            />
            <SettingItem
              icon="email-outline"
              title={t("settings.contact")}
              onPress={() => openURL("https://ssdown.app/contact")}
            />
          </View>
        </View>

        {/* Misc section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {t("settings.misc")}
          </ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="cog-outline"
              title={t("settings.openSystemSettings")}
              subtitle={t("settings.openSystemSettingsSubtitle")}
              onPress={openSettings}
            />
          </View>
        </View>
      </ScrollView>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
  },
  modalMessage: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 4,
    backgroundColor: "#22c55e",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalButtonSecondary: {
    backgroundColor: "#e2e8f0",
  },
  modalButtonDestructive: {
    backgroundColor: "#ef4444",
  },
  modalButtonPrimary: {
    backgroundColor: "#22c55e",
  },
});
