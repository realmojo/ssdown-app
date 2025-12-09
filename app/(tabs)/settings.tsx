import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

export default function SettingsScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [videoCount, setVideoCount] = useState(0);

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
  }, [checkPermission, loadVideoCount]);

  const requestPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        Alert.alert("성공", "저장 권한이 허용되었습니다.");
      } else {
        Alert.alert(
          "권한 필요",
          "동영상을 저장하려면 권한이 필요합니다. 설정에서 권한을 허용해주세요.",
          [
            { text: "취소", style: "cancel" },
            {
              text: "설정 열기",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      Alert.alert("오류", "권한 요청 중 오류가 발생했습니다.");
    }
  };

  const openSettings = () => {
    Linking.openSettings();
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 권한 설정 섹션 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>권한 설정</ThemedText>
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
                <ThemedText style={styles.settingTitle}>저장 권한</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  {checkingPermission
                    ? "확인 중..."
                    : hasPermission
                    ? "권한 허용됨"
                    : "권한 필요"}
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
                    허용
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

        {/* 저장 공간 섹션 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>저장 공간</ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="video-outline"
              title="다운로드한 동영상"
              subtitle={`${videoCount}개`}
            />
            <SettingItem
              icon="folder-outline"
              title="저장 위치"
              subtitle="갤러리 > ssdown 앨범"
            />
          </View>
        </View>

        {/* 앱 정보 섹션 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>앱 정보</ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="information-outline"
              title="앱 버전"
              subtitle={Constants.expoConfig?.version || "1.0.0"}
            />
            <SettingItem
              icon="code-tags"
              title="빌드 번호"
              subtitle={String(
                Constants.expoConfig?.ios?.buildNumber ||
                  Constants.expoConfig?.android?.versionCode ||
                  "1"
              )}
            />
          </View>
        </View>

        {/* 기타 섹션 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>기타</ThemedText>
          <View style={styles.surface}>
            <SettingItem
              icon="cog-outline"
              title="시스템 설정 열기"
              subtitle="권한 및 기타 설정"
              onPress={openSettings}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 20,
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
