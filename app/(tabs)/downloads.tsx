import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { getInfoAsync as getInfoAsyncLegacy } from "expo-file-system/legacy";
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
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";

const { width } = Dimensions.get("window");
// Two-column grid; 24px padding on both sides
const ITEM_SIZE = (width - 48) / 2;
type ExtendedAsset = MediaLibrary.Asset & { sizeLabel?: string };

export default function DownloadsScreen() {
  const [videos, setVideos] = useState<ExtendedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ExtendedAsset | null>(
    null
  );
  const player = useVideoPlayer(selectedVideo?.uri || "", (player) => {
    player.loop = false;
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [actionAsset, setActionAsset] = useState<ExtendedAsset | null>(null);
  const [filterType, setFilterType] = useState<
    "all" | "x" | "tiktok" | "facebook" | "instagram"
  >("all");

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch ssdown album
      const album = await MediaLibrary.getAlbumAsync("ssdown");

      if (!album) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get all assets from the album (video only)
      const assets = await MediaLibrary.getAssetsAsync({
        album: album,
        mediaType: MediaLibrary.MediaType.video,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 100, // up to 100 items
      });

      const assetsWithSize: ExtendedAsset[] = await Promise.all(
        assets.assets.map(async (asset) => {
          try {
            const info = await getInfoAsyncLegacy(asset.uri);
            const sizeLabel =
              info.exists && typeof info.size === "number"
                ? `${(info.size / (1024 * 1024)).toFixed(2)} MB`
                : undefined;
            return { ...asset, sizeLabel };
          } catch (error) {
            console.warn("Failed to get file info:", error);
            return { ...asset };
          }
        })
      );

      setVideos(assetsWithSize);
    } catch (error) {
      console.error("Error loading videos:", error);
      Alert.alert("Error", "Failed to load the video list.");
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
    if (selectionMode) {
      toggleSelect(asset);
      return;
    }
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
          dialogTitle: "Share video",
        });
      } else {
        Alert.alert("Notice", "Sharing is not available.");
      }
    } catch (error) {
      console.error("Error sharing video:", error);
      Alert.alert("Error", "An error occurred while sharing the video.");
    }
  };

  const openActionMenu = (asset: MediaLibrary.Asset) => {
    setActionAsset(asset);
  };

  const closeActionMenu = () => {
    setActionAsset(null);
  };

  const handleShareAction = async () => {
    if (!actionAsset) return;
    await handleShare(actionAsset);
    closeActionMenu();
  };

  const handleDeleteAction = async () => {
    if (!actionAsset) return;
    Alert.alert("Delete video", "Are you sure you want to delete this video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await MediaLibrary.deleteAssetsAsync([actionAsset.id]);
            setVideos((prev) => prev.filter((v) => v.id !== actionAsset.id));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(actionAsset.id);
              return next;
            });
          } catch (error) {
            console.error("Error deleting video:", error);
            Alert.alert("Error", "Failed to delete video.");
          } finally {
            closeActionMenu();
          }
        },
      },
    ]);
  };

  const toggleSelect = (asset: MediaLibrary.Asset) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Delete videos",
      `Are you sure you want to delete ${selectedIds.size} video(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await MediaLibrary.deleteAssetsAsync(Array.from(selectedIds));
              setVideos((prev) => prev.filter((v) => !selectedIds.has(v.id)));
              clearSelection();
            } catch (error) {
              console.error("Error deleting videos:", error);
              Alert.alert("Error", "Failed to delete videos.");
            }
          },
        },
      ]
    );
  };

  const closeVideoPlayer = () => {
    if (player) {
      player.pause();
    }
    setTimeout(() => {
      setSelectedVideo(null);
    }, 300);
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const filterVideos = useCallback(
    (videos: ExtendedAsset[]) => {
      if (filterType === "all") return videos;

      return videos.filter((video) => {
        const filename = (video.filename || "").toLowerCase();
        switch (filterType) {
          case "x":
            return filename.includes("x") || filename.includes("twitter");
          case "tiktok":
            return filename.includes("tiktok");
          case "facebook":
            return filename.includes("facebook") || filename.includes("fb");
          case "instagram":
            return filename.includes("instagram") || filename.includes("ig");
          default:
            return true;
        }
      });
    },
    [filterType]
  );

  const filteredVideos = filterVideos(videos);

  const renderVideoItem = ({ item }: { item: ExtendedAsset }) => {
    const isList = viewMode === "list";
    const title = item.filename || "Downloaded video";
    const isSelected = selectedIds.has(item.id);

    return (
      <Pressable
        style={[
          styles.videoCard,
          isList && styles.videoCardList,
          isSelected && styles.videoCardSelected,
        ]}
        onPress={() => handleVideoPress(item)}
        onLongPress={() => toggleSelect(item)}
        android_ripple={{ color: "#dbeafe" }}
      >
        <View
          style={[
            styles.thumbnailContainer,
            isList && styles.thumbnailContainerList,
          ]}
        >
          <Image
            source={{ uri: item.uri }}
            style={[styles.thumbnail, isList && styles.thumbnailList]}
            contentFit="cover"
          />
          <View
            style={[styles.durationBadge, isList && styles.durationBadgeList]}
          >
            <ThemedText style={styles.durationText}>
              {formatDuration(item.duration)}
            </ThemedText>
          </View>
          {isSelected && (
            <View style={styles.selectionOverlay}>
              <MaterialCommunityIcons
                name="check-circle"
                size={32}
                color="#3b82f6"
              />
            </View>
          )}
        </View>
        <View style={[styles.videoInfo, isList && styles.videoInfoList]}>
          <ThemedText style={styles.videoTitle} numberOfLines={isList ? 1 : 2}>
            {title}
          </ThemedText>
          <View style={styles.metaRow}>
            {/* {item.sizeLabel && (
              <View style={styles.sizeBadge}>
                <ThemedText style={styles.sizeText}>
                  {item.sizeLabel}
                </ThemedText>
              </View>
            )} */}
            {isList && (
              <Pressable
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  openActionMenu(item);
                }}
              >
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={20}
                  color="#64748b"
                />
              </Pressable>
            )}
          </View>
        </View>
        {!isList && (
          <Pressable
            style={styles.gridActionButton}
            onPress={(e) => {
              e.stopPropagation();
              openActionMenu(item);
            }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color="#64748b"
            />
          </Pressable>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d8fff" />
        <ThemedText style={styles.loadingText}>Loading videos...</ThemedText>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="folder-outline"
          size={80}
          color="#cbd5e1"
        />
        <ThemedText style={styles.emptyTitle}>
          No downloaded videos yet
        </ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Download videos from Home to see them here.
        </ThemedText>
      </View>
    );
  }

  if (filteredVideos.length === 0 && videos.length > 0) {
    return (
      <>
        <View style={styles.headerBar}>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "list" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <MaterialCommunityIcons
              name={viewMode === "grid" ? "view-grid" : "view-list"}
              size={16}
              color={"#fff"}
            />
          </Pressable>
        </View>
        <View style={styles.videoTypeButtonsContainer}>
          <Pressable
            style={[
              styles.videoTypeButton,
              filterType === "all" && styles.videoTypeButtonActive,
            ]}
            onPress={() => setFilterType("all")}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <ThemedText
              style={[
                styles.videoTypeButtonText,
                filterType === "all" && styles.videoTypeButtonTextActive,
              ]}
            >
              All
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.videoTypeButton,
              filterType === "x" && styles.videoTypeButtonActive,
            ]}
            onPress={() => setFilterType("x")}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <ThemedText
              style={[
                styles.videoTypeButtonText,
                filterType === "x" && styles.videoTypeButtonTextActive,
              ]}
            >
              X
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.videoTypeButton,
              filterType === "tiktok" && styles.videoTypeButtonActive,
            ]}
            onPress={() => setFilterType("tiktok")}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <ThemedText
              style={[
                styles.videoTypeButtonText,
                filterType === "tiktok" && styles.videoTypeButtonTextActive,
              ]}
            >
              Tiktok
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.videoTypeButton,
              filterType === "facebook" && styles.videoTypeButtonActive,
            ]}
            onPress={() => setFilterType("facebook")}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <ThemedText
              style={[
                styles.videoTypeButtonText,
                filterType === "facebook" && styles.videoTypeButtonTextActive,
              ]}
            >
              Facebook
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.videoTypeButton,
              filterType === "instagram" && styles.videoTypeButtonActive,
            ]}
            onPress={() => setFilterType("instagram")}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <ThemedText
              style={[
                styles.videoTypeButtonText,
                filterType === "instagram" && styles.videoTypeButtonTextActive,
              ]}
            >
              Instagram
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="filter-off-outline"
            size={80}
            color="#cbd5e1"
          />
          <ThemedText style={styles.emptyTitle}>No videos found</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Try selecting a different filter.
          </ThemedText>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.headerBar}>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === "list" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          android_ripple={{ color: "#e3ebf5" }}
        >
          <MaterialCommunityIcons
            name={viewMode === "grid" ? "view-grid" : "view-list"}
            size={16}
            color={"#fff"}
          />
        </Pressable>
      </View>
      {selectionMode && (
        <View style={styles.selectionBar}>
          <ThemedText style={styles.selectionText}>
            {selectedIds.size} selected
          </ThemedText>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              style={styles.selectionButton}
              onPress={deleteSelected}
              android_ripple={{ color: "#ffd6d6" }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color="#e11d48"
              />
              <ThemedText style={styles.selectionButtonText}>Delete</ThemedText>
            </Pressable>
            <Pressable
              style={styles.selectionButton}
              onPress={clearSelection}
              android_ripple={{ color: "#e3ebf5" }}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={20}
                color="#1d8fff"
              />
              <ThemedText style={styles.selectionButtonText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
      <View style={styles.videoTypeButtonsContainer}>
        <Pressable
          style={[
            styles.videoTypeButton,
            filterType === "all" && styles.videoTypeButtonActive,
          ]}
          onPress={() => setFilterType("all")}
          android_ripple={{ color: "#e3ebf5" }}
        >
          <ThemedText
            style={[
              styles.videoTypeButtonText,
              filterType === "all" && styles.videoTypeButtonTextActive,
            ]}
          >
            All
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.videoTypeButton,
            filterType === "x" && styles.videoTypeButtonActive,
          ]}
          onPress={() => setFilterType("x")}
          android_ripple={{ color: "#e3ebf5" }}
        >
          <ThemedText
            style={[
              styles.videoTypeButtonText,
              filterType === "x" && styles.videoTypeButtonTextActive,
            ]}
          >
            X
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.videoTypeButton,
            filterType === "tiktok" && styles.videoTypeButtonActive,
          ]}
          onPress={() => setFilterType("tiktok")}
          android_ripple={{ color: "#e3ebf5" }}
        >
          <ThemedText
            style={[
              styles.videoTypeButtonText,
              filterType === "tiktok" && styles.videoTypeButtonTextActive,
            ]}
          >
            Tiktok
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.videoTypeButton,
            filterType === "facebook" && styles.videoTypeButtonActive,
          ]}
          onPress={() => setFilterType("facebook")}
          android_ripple={{ color: "#e3ebf5" }}
        >
          <ThemedText
            style={[
              styles.videoTypeButtonText,
              filterType === "facebook" && styles.videoTypeButtonTextActive,
            ]}
          >
            Facebook
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.videoTypeButton,
            filterType === "instagram" && styles.videoTypeButtonActive,
          ]}
          onPress={() => setFilterType("instagram")}
          android_ripple={{ color: "#e3ebf5" }}
        >
          <ThemedText
            style={[
              styles.videoTypeButtonText,
              filterType === "instagram" && styles.videoTypeButtonTextActive,
            ]}
          >
            Instagram
          </ThemedText>
        </Pressable>
      </View>
      <FlatList
        key={`view-${viewMode}`}
        data={filteredVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === "grid" ? styles.row : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
      {/* Video player modal */}
      <Modal
        visible={selectedVideo !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={closeVideoPlayer}
      >
        <View style={styles.videoPlayerContainer}>
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
        </View>
      </Modal>
      {/* Action menu */}
      <Modal
        visible={actionAsset !== null}
        transparent
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <TouchableWithoutFeedback onPress={closeActionMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.menuSheet}>
          <ThemedText style={styles.menuTitle}>Actions</ThemedText>
          <Pressable
            style={styles.menuItem}
            onPress={handleShareAction}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <MaterialCommunityIcons
              name="share-outline"
              size={20}
              color="#0f172a"
            />
            <ThemedText style={styles.menuItemText}>Share</ThemedText>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={handleDeleteAction}
            android_ripple={{ color: "#ffe4e6" }}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color="#e11d48"
            />
            <ThemedText style={[styles.menuItemText, { color: "#e11d48" }]}>
              Delete
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={closeActionMenu}
            android_ripple={{ color: "#e3ebf5" }}
          >
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={20}
              color="#475569"
            />
            <ThemedText style={styles.menuItemText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
    backgroundColor: "#f8fafc",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  videoCard: {
    width: ITEM_SIZE,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#1e293b",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    // borderWidth: 1,
    // borderColor: "#f1f5f9",
    marginBottom: 4,
  },
  thumbnailContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    backgroundColor: "#f8fafc",
  },
  thumbnailContainerList: {
    width: 140,
    height: 80,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailList: {
    width: "100%",
    height: "100%",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backdropFilter: "blur(10px)",
  },
  durationText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  durationBadgeList: {
    bottom: 6,
    right: 6,
  },
  videoInfo: {
    padding: 14,
    gap: 8,
    flex: 1,
    backgroundColor: "#ffffff",
  },
  videoInfoList: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  videoSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  sizeBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  sizeText: {
    fontSize: 11,
    color: "#0369a1",
    fontWeight: "700",
  },
  durationBadgeRow: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoActions: {
    flexDirection: "row",
    gap: 8,
  },
  videoActionsList: {
    gap: 6,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionButtonList: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  gridActionButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 4,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "700",
  },
  videoCardList: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  videoCardSelected: {
    borderWidth: 2,
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  // Header Bar
  headerBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
  },
  // Toggle Button
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    // backgroundColor: Colors.light.tint,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "transparent",
    borderColor: "#fff",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  // Video Type Filter Buttons
  videoTypeButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "transparent",
  },
  videoTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  videoTypeButtonActive: {
    color: "#000",
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  videoTypeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  videoTypeButtonTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  selectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f5fb",
    borderBottomWidth: 1,
    borderBottomColor: "#e3ebf5",
  },
  selectionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
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
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
});
