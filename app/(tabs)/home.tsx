import { ThemedText } from "@/components/themed-text";
import { tintColorLight } from "@/constants/theme";
import { getVideoType } from "@/utils/common";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import * as Network from "expo-network";
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
import { useDownloadPolicy } from "../context/download-policy";

interface DownloadResult {
  thumbnail?: string;
  user?: { name: string; handle: string; avatar?: string };
  createdAt?: string;
  tag?: string;
  content?: string;
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
    // "https://x.com/uahan2/status/1989118595876675673/video/1"
    // "https://www.tiktok.com/@user58210557014162/video/7580653045323795733?is_from_webapp=1&sender_device=pc"
    "https://www.facebook.com/share/r/1AFGYu1iFk/"
  );
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);
  const { wifiOnly } = useDownloadPolicy();

  const handleDownload = async () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a URL");
      return;
    }

    setLoading(true);
    setError(null);
    setShowResult(false);

    const videoType = getVideoType(url);
    console.log("videoType", videoType);
    if (videoType === "unknown") {
      Alert.alert("Error", "Invalid URL");
      return;
    }

    try {
      const apiUrl = `https://ssdown.app/api/${videoType}?url=${url}`;
      const response = await fetch(apiUrl);
      let data = await response.json();

      if (videoType === "instagram") {
        data = data[0];
      }

      // Date formatting helper
      const formatDate = (dateString: string) => {
        console.log("dateString", dateString);
        try {
          let date = new Date(dateString);
          console.log("date", date);
          if (isNaN(date.getTime())) {
            date = new Date();
          }
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}. ${month}. ${day}.`;
        } catch {
          return new Date().toLocaleDateString("ko-KR");
        }
      };

      // Number formatting helper (e.g., 2,000,000 -> "2M", 48,000 -> "48K")
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

      // Hashtag extractor
      const extractHashtag = (content: string) => {
        const hashtagMatch = content.match(/#\w+/);
        return hashtagMatch ? hashtagMatch[0] : "";
      };

      // Handle user names
      const userName = data.user?.name || data.user?.screenName || "Unknown";
      const screenName = data.user?.screenName || "";

      // Map API response into the DownloadResult shape
      const result: DownloadResult = {
        thumbnail: data.thumbnail,
        content: data.content,
        user: {
          name: userName,
          handle: screenName ? `@${screenName}` : "@unknown",
          avatar: data.user?.avatar,
        },
        createdAt: data.createdAt ? formatDate(data.createdAt) : "",
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
              label:
                item.quality || item.bitrate || `${item.content_type || "mp4"}`,
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
      // Check current permission state
      const { status: currentStatus } =
        await MediaLibrary.getPermissionsAsync();

      // If already granted, return early
      if (currentStatus === "granted") {
        return true;
      }

      // Request permission if missing or denied
      const { status, canAskAgain } =
        await MediaLibrary.requestPermissionsAsync();

      if (status === "granted") {
        return true;
      }

      // Handle denied permission
      let message =
        "Media library permission is required to save videos to your gallery.";

      if (!canAskAgain) {
        message +=
          "\n\nPermission was permanently denied. Please enable it in settings.";
      } else {
        message += "\n\nPlease enable it in settings.";
      }

      Alert.alert("Storage permission required", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open settings",
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]);
      return false;
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert(
        "Permission error",
        "An error occurred while requesting permission. Please try again."
      );
      return false;
    }
  };

  const handleVideoDownload = async (
    downloadUrl: string,
    quality: string,
    downloadId: string
  ) => {
    const videoType = getVideoType(url);
    if (videoType === "unknown") {
      Alert.alert("Error", "Invalid URL");
      return;
    }
    if (!downloadUrl) {
      Alert.alert("Error", "Download URL is not available");
      return;
    }

    // Enforce Wi-Fi-only downloads if enabled
    if (wifiOnly) {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (
          !networkState.isConnected ||
          networkState.type !== Network.NetworkStateType.WIFI
        ) {
          Alert.alert(
            "Wi-Fi required",
            "Downloads are limited to Wi-Fi. Please connect to Wi-Fi or disable the Wi-Fi-only setting in Settings."
          );
          return;
        }
      } catch (error) {
        console.warn("Network check failed:", error);
        Alert.alert(
          "Network check failed",
          "Could not verify network type. Please check your connection and try again."
        );
        return;
      }
    }

    setDownloadingVideo(downloadId);

    try {
      // Request permission before download
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        setDownloadingVideo(null);
        return;
      }

      console.log("videoType", videoType);
      // Build download API URL
      const apiDownloadUrl = `https://ssdown.app/api/${videoType}/download?videoUrl=${encodeURIComponent(
        downloadUrl
      )}`;

      // Generate filename
      const fileName = `video_${videoType}_${Date.now()}.mp4`;

      // Save file temporarily inside the app
      const tempDir = new Directory(Paths.cache, "temp");
      if (!tempDir.exists) {
        tempDir.create({ intermediates: true, idempotent: true });
      }
      const tempFile = new File(tempDir, fileName);

      // Download file
      const response = await fetch(apiDownloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Convert response to ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Convert to Uint8Array and write to the temp file
      const uint8Array = new Uint8Array(arrayBuffer);
      await tempFile.write(uint8Array);

      // Save to the ssdown album via MediaLibrary
      try {
        // Save to gallery with MediaLibrary
        const asset = await MediaLibrary.createAssetAsync(tempFile.uri);

        // Create or fetch the ssdown album
        let album = await MediaLibrary.getAlbumAsync("ssdown");
        if (!album) {
          album = await MediaLibrary.createAlbumAsync("ssdown", asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        Alert.alert(
          "Download complete",
          `The video has been saved to the ssdown album in your gallery.\n\nYou can find it in your gallery app.`
        );
      } catch (mediaError) {
        // If MediaLibrary fails, fall back to sharing dialog
        console.error("MediaLibrary error:", mediaError);
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(tempFile.uri, {
            mimeType: "video/mp4",
            dialogTitle: `Save video`,
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

  const socialButtons = useMemo(
    () => [
      {
        key: "x",
        icon: "x-twitter",
        label: "X",
        color: "#1f2937",
      },
      {
        key: "tiktok",
        icon: "tiktok",
        label: "Tiktok",
        color: "#0f172a",
      },
      {
        key: "facebook",
        icon: "facebook",
        label: "Facebook",
        color: "#0a7cff",
      },
      {
        key: "instagram",
        icon: "instagram",
        label: "Instagram",
        color: "#df73a3",
      },
    ],
    []
  );

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inputRow}>
        <MaterialCommunityIcons name="earth" size={22} color="#9ca3af" />
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="URL 검색 또는 입력"
          placeholderTextColor="#9ca3af"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      {/* Download Button */}
      <Pressable
        style={[styles.searchButton, loading && styles.searchButtonDisabled]}
        android_ripple={{ color: "rgba(255,255,255,0.14)" }}
        onPress={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" style={{ height: 24 }} /> // small size
        ) : (
          <ThemedText style={styles.searchButtonText}>DOWNLOAD</ThemedText>
        )}
      </Pressable>
      <View style={styles.socialGrid}>
        {socialButtons.map((item) => (
          <Pressable
            key={item.key}
            style={styles.socialItem}
            android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          >
            <View
              style={[styles.socialCircle, { backgroundColor: item.color }]}
            >
              {item.label === "X" && (
                <FontAwesome6 name="x-twitter" size={28} color="#fff" />
              )}
              {item.label === "Tiktok" && (
                <FontAwesome6 name="tiktok" size={28} color="#fff" />
              )}
              {item.label === "Facebook" && (
                <FontAwesome6 name="facebook" size={28} color="#fff" />
              )}
              {item.label === "Instagram" && (
                <FontAwesome6 name="instagram" size={28} color="#fff" />
              )}
            </View>
            <ThemedText style={styles.socialLabel}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>
      {/* <Pressable
        style={styles.tipCard}
        android_ripple={{ color: "rgba(255,255,255,0.08)" }}
      >
        <View style={styles.tipIcon}>
          <MaterialIcons name="movie-creation" size={24} color="#0ea5e9" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.tipText}>
            비디오를 다운로드하는 방법?
          </ThemedText>
        </View>
        <MaterialIcons name="arrow-forward-ios" size={18} color="#e2e8f0" />
      </Pressable> */}

      {loading && !showResult && (
        <View style={styles.surface}>
          <ThemedText style={styles.skeletonLoadingText}>Loading...</ThemedText>
          <View style={styles.skeletonThumb} />
          <View style={styles.profileRow}>
            <View style={styles.skeletonAvatar} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: "50%" }]} />
            </View>
            <View style={styles.skeletonPill} />
          </View>
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonStatsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonStatItem}>
                <View style={styles.skeletonIcon} />
                <View style={[styles.skeletonLine, { width: 40 }]} />
              </View>
            ))}
          </View>
          <View style={styles.skeletonDownloadRow} />
          <View style={styles.skeletonDownloadRow} />
          <View style={styles.skeletonDownloadRow} />
        </View>
      )}

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
              {downloadResult.createdAt && (
                <View style={styles.datePill}>
                  <MaterialCommunityIcons
                    name="calendar-blank-outline"
                    size={18}
                    color="#9aa7b8"
                  />
                  <ThemedText style={styles.dateText}>
                    {downloadResult.createdAt}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {downloadResult.content && (
            <ThemedText style={styles.contentText}>
              {downloadResult.content}
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
                  <ThemedText style={[styles.statValue, { color: item.color }]}>
                    {item.value}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {downloadResult.downloads && downloadResult.downloads.length > 0 && (
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
                        downloadingVideo === (item.id || index.toString()) &&
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
                      {downloadingVideo === (item.id || index.toString()) ? (
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
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 32,
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "800",
  },
  inputCard: {
    backgroundColor: "#0f172a",
    borderRadius: 28,
    padding: 4,
    borderWidth: 1,
    borderColor: "#111827",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1f2937",
    borderRadius: 24,
  },
  input: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 16,
    color: "#e5e7eb",
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  socialItem: {
    width: "23%",
    alignItems: "center",
    gap: 8,
  },
  socialCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    textAlign: "center",
  },
  searchButton: {
    width: "100%",
    backgroundColor: tintColorLight,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#111827",
    gap: 6,
  },
  infoTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  infoBody: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(14,165,233,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  surface: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#111827",
  },
  mediaCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  preview: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  skeletonThumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#111827",
    borderRadius: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111827",
  },
  skeletonLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#111827",
    width: "80%",
  },
  skeletonPill: {
    width: 90,
    height: 26,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  skeletonStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  skeletonStatItem: {
    alignItems: "center",
    gap: 6,
  },
  skeletonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111827",
  },
  skeletonDownloadRow: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  skeletonLoadingText: {
    marginTop: 12,
    color: "#9aa7b8",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
    backgroundColor: "#111827",
  },
  contentText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  dateText: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  tagText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5e7eb",
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
    color: "#e5e7eb",
  },
  downloadHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    fontSize: 13,
    fontWeight: "700",
    color: "#cbd5e1",
  },
  downloadList: {
    marginTop: 8,
    gap: 10,
  },
  downloadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
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
    color: "#e5e7eb",
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
  errorText: {
    color: "#ff2d87",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  adContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
