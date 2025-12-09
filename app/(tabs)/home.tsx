import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

interface DownloadResult {
  thumbnail?: string;
  user?: { name: string; handle: string; avatar?: string };
  date?: string;
  tag?: string;
  stats?: Array<{
    key: string;
    icon: string;
    value: string;
    color: string;
  }>;
  downloads?: Array<{ id: string; label: string; url?: string }>;
}

export default function HomeScreen() {
  const [url, setUrl] = useState(
    "https://www.tiktok.com/@hahahago99/video/7553175660416519444"
  );
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a URL");
      return;
    }

    setLoading(true);
    setError(null);
    setShowResult(false);

    try {
      const apiUrl = `https://ssdown.app/api/tiktok?url=${encodeURIComponent(
        url
      )}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // 날짜 포맷팅 함수
      const formatDate = (dateString: string) => {
        try {
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}. ${month}. ${day}.`;
        } catch {
          return new Date().toLocaleDateString("ko-KR");
        }
      };

      // 숫자 포맷팅 함수 (예: 2000000 -> "2M", 48000 -> "48K")
      const formatNumber = (num: number) => {
        if (num >= 1000000) {
          const value = num / 1000000;
          return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}M`;
        } else if (num >= 1000) {
          const value = num / 1000;
          return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}K`;
        }
        return num.toString();
      };

      // 해시태그 추출 함수
      const extractHashtag = (content: string) => {
        const hashtagMatch = content.match(/#\w+/);
        return hashtagMatch ? hashtagMatch[0] : "";
      };

      // 사용자 이름 처리
      const userName = data.user?.name || data.user?.screenName || "Unknown";
      const screenName = data.user?.screenName || "";

      // API 응답을 downloadResult 형식으로 변환
      const result: DownloadResult = {
        thumbnail: data.thumbnail,
        user: {
          name: userName,
          handle: screenName ? `@${screenName}` : "@unknown",
          avatar: data.user?.avatar,
        },
        date: data.createdAt ? formatDate(data.createdAt) : "",
        tag: data.content ? extractHashtag(data.content) : "",
        stats: data.stats
          ? [
              {
                key: "views",
                icon: "eye-outline",
                value: formatNumber(data.stats.viewCount || 0),
                color: "#7a8699",
              },
              {
                key: "likes",
                icon: "heart-outline",
                value: formatNumber(data.stats.favoriteCount || 0),
                color: "#ff2d87",
              },
              {
                key: "comments",
                icon: "message-processing-outline",
                value: formatNumber(data.stats.replyCount || 0),
                color: "#0a7cff",
              },
              {
                key: "shares",
                icon: "share-outline",
                value: formatNumber(data.stats.shareCount || 0),
                color: "#1eb980",
              },
            ]
          : [],
        downloads: data.videoItems
          ? data.videoItems.map((item: any, index: number) => ({
              id: `video-${index}`,
              label: item.bitrate || `${item.content_type || "mp4"}`,
              url: decodeURIComponent(item.url || ""),
            }))
          : [],
      };

      setDownloadResult(result);
      setShowResult(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch video data";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      // 현재 권한 상태 확인
      const { status: currentStatus } =
        await MediaLibrary.getPermissionsAsync();

      // 이미 권한이 있으면 true 반환
      if (currentStatus === "granted") {
        return true;
      }

      // 권한이 없거나 거부된 경우 요청
      const { status, canAskAgain } =
        await MediaLibrary.requestPermissionsAsync();

      if (status === "granted") {
        return true;
      }

      // 권한이 거부된 경우
      let message =
        "동영상을 갤러리에 저장하려면 미디어 라이브러리 접근 권한이 필요합니다.";

      if (!canAskAgain) {
        message +=
          "\n\n권한이 영구적으로 거부되었습니다. 설정에서 권한을 허용해주세요.";
      } else {
        message += "\n\n설정에서 권한을 허용해주세요.";
      }

      Alert.alert("저장 권한 필요", message, [
        { text: "취소", style: "cancel" },
        {
          text: "설정 열기",
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]);
      return false;
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert(
        "권한 오류",
        "권한 요청 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      return false;
    }
  };

  const handleVideoDownload = async (
    downloadUrl: string,
    quality: string,
    downloadId: string
  ) => {
    if (!downloadUrl) {
      Alert.alert("Error", "Download URL is not available");
      return;
    }

    setDownloadingVideo(downloadId);

    try {
      // 권한 요청
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        setDownloadingVideo(null);
        return;
      }

      // 다운로드 API URL 생성
      const apiDownloadUrl = `https://ssdown.app/api/tiktok/download?videoUrl=${encodeURIComponent(
        downloadUrl
      )}`;

      // 파일명 생성
      const fileName = `video_${quality}_${Date.now()}.mp4`;

      // 임시로 앱 내부에 파일 저장
      const tempDir = new Directory(Paths.cache, "temp");
      if (!tempDir.exists) {
        tempDir.create({ intermediates: true, idempotent: true });
      }
      const tempFile = new File(tempDir, fileName);

      // 파일 다운로드
      const response = await fetch(apiDownloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // 응답을 ArrayBuffer로 변환
      const arrayBuffer = await response.arrayBuffer();

      // Uint8Array로 변환하여 임시 파일에 쓰기
      const uint8Array = new Uint8Array(arrayBuffer);
      await tempFile.write(uint8Array);

      // MediaLibrary를 사용하여 갤러리의 ssdown 앨범에 저장
      try {
        // MediaLibrary를 사용하여 갤러리에 저장
        const asset = await MediaLibrary.createAssetAsync(tempFile.uri);

        // ssdown 앨범 생성 또는 가져오기
        let album = await MediaLibrary.getAlbumAsync("ssdown");
        if (!album) {
          album = await MediaLibrary.createAlbumAsync("ssdown", asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        Alert.alert(
          "다운로드 완료",
          `동영상이 갤러리의 ssdown 앨범에 저장되었습니다.\n\n갤러리 앱에서 ssdown 앨범을 확인할 수 있습니다.`
        );
      } catch (mediaError) {
        // MediaLibrary 실패 시 공유 다이얼로그 사용
        console.error("MediaLibrary error:", mediaError);
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(tempFile.uri, {
            mimeType: "video/mp4",
            dialogTitle: `동영상 저장`,
            UTI: "public.movie",
          });
        } else {
          Alert.alert("Download Complete", `Video saved to: ${tempFile.uri}`);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to download video. Please try again.";
      Alert.alert("Download Error", errorMessage);
    } finally {
      setDownloadingVideo(null);
    }
  };

  const socialIcons = useMemo(
    () => [
      {
        key: "youtube",
        lib: "FontAwesome",
        name: "youtube-play",
        color: "#ff0000",
      },
      {
        key: "facebook",
        lib: "FontAwesome",
        name: "facebook-f",
        color: "#1877f2",
      },
      {
        key: "instagram",
        lib: "FontAwesome",
        name: "instagram",
        color: "#f77737",
      },
      { key: "tiktok", lib: "FontAwesome5", name: "tiktok", color: "#010101" },
      { key: "twitter", lib: "FontAwesome", name: "twitter", color: "#1d9bf0" },
      { key: "vimeo", lib: "FontAwesome", name: "vimeo", color: "#1ab7ea" },
      {
        key: "dailymotion",
        lib: "MaterialCommunityIcons",
        name: "alpha-d-circle",
        color: "#0a7cff",
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.surface}>
          <View style={styles.inputRow}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="여기에 URL을 입력하세요"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <MaterialIcons name="content-copy" size={24} color="#1d8fff" />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            android_ripple={{ color: "#66b8ff" }}
            onPress={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                Download Video
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* <View style={styles.surface}>
          <View style={styles.socialGrid}>
            {socialIcons.map((icon) => {
              const size = 68;
              const iconProps = { color: "#fff", size: size * 0.55 };
              return (
                <View
                  key={icon.key}
                  style={[styles.socialCircle, { backgroundColor: icon.color }]}
                >
                  {icon.lib === "FontAwesome" && (
                    <FontAwesome name={icon.name as any} {...iconProps} />
                  )}
                  {icon.lib === "FontAwesome5" && (
                    <FontAwesome5 name={icon.name as any} {...iconProps} />
                  )}
                  {icon.lib === "MaterialCommunityIcons" && (
                    <MaterialCommunityIcons
                      name={icon.name as any}
                      {...iconProps}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View> */}

        {showResult && downloadResult && (
          <View style={styles.surface}>
            {downloadResult.thumbnail && (
              <View style={styles.mediaCard}>
                <Image
                  source={{ uri: downloadResult.thumbnail }}
                  style={styles.preview}
                  contentFit="cover"
                />
              </View>
            )}

            {downloadResult.user && (
              <View style={styles.profileRow}>
                {downloadResult.user.avatar ? (
                  <Image
                    source={{ uri: downloadResult.user.avatar }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatar} />
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.profileName}>
                    {downloadResult.user.name}
                  </ThemedText>
                  <ThemedText style={styles.profileHandle}>
                    {downloadResult.user.handle}
                  </ThemedText>
                </View>
                {downloadResult.date && (
                  <View style={styles.datePill}>
                    <MaterialCommunityIcons
                      name="calendar-blank-outline"
                      size={18}
                      color="#9aa7b8"
                    />
                    <ThemedText style={styles.dateText}>
                      {downloadResult.date}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            {downloadResult.tag && (
              <ThemedText style={styles.tagText}>
                {downloadResult.tag}
              </ThemedText>
            )}

            {downloadResult.stats && downloadResult.stats.length > 0 && (
              <View style={styles.statsRow}>
                {downloadResult.stats.map((item) => (
                  <View key={item.key} style={styles.statItem}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={22}
                      color={item.color}
                    />
                    <ThemedText
                      style={[styles.statValue, { color: item.color }]}
                    >
                      {item.value}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {downloadResult.downloads &&
              downloadResult.downloads.length > 0 && (
                <>
                  <View style={styles.downloadHeader}>
                    <ThemedText style={styles.sectionTitle}>
                      DOWNLOAD OPTIONS
                    </ThemedText>
                  </View>

                  <View style={styles.downloadList}>
                    {downloadResult.downloads.map((item, index) => (
                      <View key={item.id || index} style={styles.downloadRow}>
                        <View style={styles.dot} />
                        <ThemedText style={styles.quality}>
                          {item.label || item.id || `Option ${index + 1}`}
                        </ThemedText>
                        <Pressable
                          style={({ pressed }) => [
                            styles.downloadButton,
                            pressed && styles.downloadButtonPressed,
                            downloadingVideo ===
                              (item.id || index.toString()) &&
                              styles.downloadButtonDisabled,
                          ]}
                          android_ripple={{ color: "#ffd6f2" }}
                          onPress={() => {
                            if (item.url && !downloadingVideo) {
                              handleVideoDownload(
                                item.url,
                                item.label || item.id || "video",
                                item.id || index.toString()
                              );
                            }
                          }}
                          disabled={
                            !!downloadingVideo &&
                            downloadingVideo === (item.id || index.toString())
                          }
                        >
                          {downloadingVideo ===
                          (item.id || index.toString()) ? (
                            <ActivityIndicator size="small" color="#e6007a" />
                          ) : (
                            <>
                              <ThemedText style={styles.downloadText}>
                                Download
                              </ThemedText>
                              <MaterialIcons
                                name="file-download"
                                size={20}
                                color="#e6007a"
                              />
                            </>
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              )}
          </View>
        )}

        {error && (
          <View style={styles.surface}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 20,
    gap: 18,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  surface: {
    backgroundColor: "#fdfefe",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    elevation: 3,
    shadowColor: "#6aa8ff",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e3ebf5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#6aa8ff",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#1d8fff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#1d8fff",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  reactLogo: {
    height: 178,
    width: 290,
    alignSelf: "center",
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  socialCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6aa8ff",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  mediaCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#eef4ff",
  },
  preview: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#cce5ff",
    overflow: "hidden",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileHandle: {
    color: "#7a8699",
    marginTop: 2,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f1f5fb",
  },
  dateText: {
    color: "#7a8699",
    fontSize: 13,
  },
  tagText: {
    fontSize: 18,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statItem: {
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  downloadHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    fontSize: 13,
    fontWeight: "700",
    color: "#7a8699",
  },
  downloadList: {
    marginTop: 8,
    gap: 10,
  },
  downloadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    elevation: 2,
    shadowColor: "#6aa8ff",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff2d87",
  },
  quality: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    color: "#000",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadButtonPressed: {
    opacity: 0.85,
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  downloadText: {
    color: "#e6007a",
    fontWeight: "700",
  },
  promoCard: {
    backgroundColor: "#2979ff",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  promoTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  promoBody: {
    color: "#e8f0ff",
    marginTop: 6,
    lineHeight: 20,
  },
  errorText: {
    color: "#ff2d87",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
