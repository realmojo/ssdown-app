import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 48) / 2; // 2열 그리드, 양쪽 패딩 24px

export default function DownloadsScreen() {
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaLibrary.Asset | null>(
    null
  );
  const player = useVideoPlayer(selectedVideo?.uri || "", (player) => {
    player.loop = false;
  });

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      // ssdown 앨범 가져오기
      const album = await MediaLibrary.getAlbumAsync("ssdown");

      if (!album) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // 앨범의 모든 에셋 가져오기 (동영상만)
      const assets = await MediaLibrary.getAssetsAsync({
        album: album,
        mediaType: MediaLibrary.MediaType.video,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 100, // 최대 100개
      });

      for (const asset of assets.assets) {
        console.log(asset);
      }

      setVideos(assets.assets);
    } catch (error) {
      console.error("Error loading videos:", error);
      Alert.alert("오류", "동영상 목록을 불러오는 중 오류가 발생했습니다.");
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [loadVideos])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVideos();
  }, [loadVideos]);

  const handleVideoPress = (asset: MediaLibrary.Asset) => {
    setSelectedVideo(asset);
  };

  useEffect(() => {
    if (selectedVideo && player) {
      player.play();
    }
  }, [selectedVideo, player]);

  const handleShare = async (asset: MediaLibrary.Asset) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(asset.uri, {
          mimeType: "video/mp4",
          dialogTitle: "동영상 공유",
        });
      } else {
        Alert.alert("알림", "공유 기능을 사용할 수 없습니다.");
      }
    } catch (error) {
      console.error("Error sharing video:", error);
      Alert.alert("오류", "동영상 공유 중 오류가 발생했습니다.");
    }
  };

  const closeVideoPlayer = () => {
    if (player) {
      player.pause();
    }
    setTimeout(() => {
      setSelectedVideo(null);
    }, 300);
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}. ${month}. ${day}`;
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const renderVideoItem = ({ item }: { item: MediaLibrary.Asset }) => (
    <Pressable
      style={styles.videoCard}
      onPress={() => handleVideoPress(item)}
      android_ripple={{ color: "#e3ebf5" }}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnail}
          contentFit="cover"
        />
        <View style={styles.durationBadge}>
          <ThemedText style={styles.durationText}>
            {formatDuration(item.duration)}
          </ThemedText>
        </View>
        <View style={styles.playIcon}>
          <MaterialIcons name="play-circle-filled" size={40} color="#fff" />
        </View>
      </View>
      <View style={styles.videoInfo}>
        <ThemedText style={styles.videoDate} numberOfLines={1}>
          {formatDate(item.modificationTime || undefined)}
        </ThemedText>
        <View style={styles.videoActions}>
          <Pressable
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleShare(item);
            }}
          >
            <MaterialCommunityIcons
              name="share-outline"
              size={20}
              color="#1d8fff"
            />
            <ThemedText style={styles.actionText}>공유</ThemedText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            다운로드
          </ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d8fff" />
          <ThemedText style={styles.loadingText}>
            동영상 목록을 불러오는 중...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (videos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            다운로드
          </ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="folder-outline"
            size={64}
            color="#9aa7b8"
          />
          <ThemedText style={styles.emptyTitle}>
            다운로드한 동영상이 없습니다
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            홈 화면에서 동영상을 다운로드하면 여기에 표시됩니다
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* 비디오 플레이어 모달 */}
      <Modal
        visible={selectedVideo !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={closeVideoPlayer}
      >
        <View style={styles.videoPlayerContainer}>
          <SafeAreaView style={styles.videoPlayerSafeArea}>
            <View style={styles.videoPlayerHeader}>
              <Pressable onPress={closeVideoPlayer} style={styles.closeButton}>
                <MaterialIcons name="close" size={28} color="#fff" />
              </Pressable>
              {selectedVideo && (
                <Pressable
                  onPress={() => handleShare(selectedVideo)}
                  style={styles.shareButton}
                >
                  <MaterialCommunityIcons
                    name="share-outline"
                    size={24}
                    color="#fff"
                  />
                </Pressable>
              )}
            </View>
            {selectedVideo && player && (
              <VideoView
                player={player}
                style={styles.videoPlayer}
                contentFit="contain"
                nativeControls
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f2f3",
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e3ebf5",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#7a8699",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7a8699",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9aa7b8",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    padding: 12,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
  },
  videoCard: {
    width: ITEM_SIZE,
    backgroundColor: "#fdfefe",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#6aa8ff",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  thumbnailContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    backgroundColor: "#eef4ff",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  playIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    opacity: 0.9,
  },
  videoInfo: {
    padding: 12,
    gap: 8,
  },
  videoDate: {
    fontSize: 13,
    color: "#7a8699",
    fontWeight: "500",
  },
  videoActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5fb",
  },
  actionText: {
    fontSize: 12,
    color: "#1d8fff",
    fontWeight: "600",
  },
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoPlayerSafeArea: {
    flex: 1,
  },
  videoPlayerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  closeButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  videoPlayer: {
    flex: 1,
    width: "100%",
  },
});
