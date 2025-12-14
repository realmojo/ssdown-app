import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { getInfoAsync as getInfoAsyncLegacy } from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { useLocale } from "../context/_locale";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 48) / 2;
type ExtendedAsset = MediaLibrary.Asset & { sizeLabel?: string };

const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === "ios"
  ? "ca-app-pub-1963334904140891/3892343586"
  : "ca-app-pub-1963334904140891/2202845633";

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
    "all" | "x" | "tiktok" | "facebook" | "instagram" | "9gag" | "dailymotion"
  >("all");
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }>({ visible: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });
  const { t } = useLocale();

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
      setErrorModal({
        visible: true,
        message: "Failed to load the video list.",
      });
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
        setInfoModal({
          visible: true,
          title: "Notice",
          message: "Sharing is not available.",
        });
      }
    } catch (error) {
      console.error("Error sharing video:", error);
      setInfoModal({
        visible: true,
        title: "Error",
        message: "An error occurred while sharing the video.",
      });
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
    setConfirmModal({
      visible: true,
      title: "Delete video",
      message: "Are you sure you want to delete this video?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
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
          setInfoModal({
            visible: true,
            title: "Error",
            message: "Failed to delete video.",
          });
        } finally {
          closeActionMenu();
        }
      },
    });
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
    setConfirmModal({
      visible: true,
      title: "Delete videos",
      message: `Are you sure you want to delete ${selectedIds.size} video(s)?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          await MediaLibrary.deleteAssetsAsync(Array.from(selectedIds));
          setVideos((prev) => prev.filter((v) => !selectedIds.has(v.id)));
          clearSelection();
        } catch (error) {
          console.error("Error deleting videos:", error);
          setInfoModal({
            visible: true,
            title: "Error",
            message: "Failed to delete videos.",
          });
        }
      },
    });
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
          case "9gag":
            return filename.includes("ninegag") || filename.includes("9gag");
          case "dailymotion":
            return filename.includes("dailymotion") || filename.includes("dm");
          default:
            return true;
        }
      });
    },
    [filterType]
  );

  const filteredVideos = filterVideos(videos);

  // 공통 비디오 타입 버튼 배열
  const videoTypeButtons = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "x", label: "X" },
      { key: "tiktok", label: "Tiktok" },
      { key: "facebook", label: "Facebook" },
      { key: "instagram", label: "Instagram" },
      { key: "9gag", label: "9GAG" },
      { key: "dailymotion", label: "DailyMotion" },
    ],
    []
  );

  // 공통 비디오 타입 버튼 렌더링 함수
  const renderVideoTypeButtons = () =>
    videoTypeButtons.map((item) => (
      <Pressable
        key={item.key}
        style={[
          styles.videoTypeButton,
          filterType === item.key && styles.videoTypeButtonActive,
        ]}
        onPress={() => setFilterType(item.key as typeof filterType)}
        android_ripple={{ color: "#e3ebf5" }}
      >
        <ThemedText
          style={[
            styles.videoTypeButtonText,
            filterType === item.key && styles.videoTypeButtonTextActive,
          ]}
        >
          {item.label}
        </ThemedText>
      </Pressable>
    ));

  // 공통 뷰 모드 토글 버튼 렌더링 함수
  const renderViewModeToggle = () => (
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
  );

  // 공통 헤더 바 렌더링 함수
  const renderHeaderBar = () => (
    <View style={styles.headerBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.videoTypeButtonsContainer}
        style={[styles.videoTypeButtonsScrollContainer]}
      >
        {renderVideoTypeButtons()}
      </ScrollView>
      <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
        {renderViewModeToggle()}
      </View>
    </View>
  );

  const renderModals = () => (
    <>
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setErrorModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[styles.modalIconCircle, { backgroundColor: "#fee2e2" }]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={32}
                color="#ef4444"
              />
            </View>
            <ThemedText style={styles.modalTitle}>Error</ThemedText>
            <ThemedText style={styles.modalMessage}>
              {errorModal.message}
            </ThemedText>
            <Pressable
              style={styles.modalButton}
              onPress={() =>
                setErrorModal((prev) => ({ ...prev, visible: false }))
              }
              android_ripple={{ color: "#fee2e2" }}
            >
              <ThemedText style={styles.modalButtonText}>OK</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
            <View
              style={[styles.modalIconCircle, { backgroundColor: "#e0f2fe" }]}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={32}
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
              android_ripple={{ color: "#e3ebf5" }}
            >
              <ThemedText style={styles.modalButtonText}>OK</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setConfirmModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[styles.modalIconCircle, { backgroundColor: "#fff7ed" }]}
            >
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={32}
                color="#f97316"
              />
            </View>
            <ThemedText style={styles.modalTitle}>
              {confirmModal.title}
            </ThemedText>
            <ThemedText style={styles.modalMessage}>
              {confirmModal.message}
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() =>
                  setConfirmModal((prev) => ({ ...prev, visible: false }))
                }
                android_ripple={{ color: "#e3ebf5" }}
              >
                <ThemedText
                  style={[styles.modalButtonText, { color: "#0f172a" }]}
                >
                  {confirmModal.cancelLabel || "Cancel"}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonDestructive]}
                onPress={async () => {
                  const onConfirm = confirmModal.onConfirm;
                  setConfirmModal((prev) => ({ ...prev, visible: false }));
                  await onConfirm?.();
                }}
                android_ripple={{ color: "#fee2e2" }}
              >
                <ThemedText style={styles.modalButtonText}>
                  {confirmModal.confirmLabel || "OK"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

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
      <>
        {renderModals()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d8fff" />
          <ThemedText style={styles.loadingText}>
            {t("downloads.loading")}
          </ThemedText>
        </View>
      </>
    );
  }

  if (videos.length === 0) {
    return (
      <>
        {renderModals()}
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="folder-outline"
            size={80}
            color="#cbd5e1"
          />
          <ThemedText style={styles.emptyTitle}>
            {t("downloads.emptyTitle")}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            {t("downloads.emptySubtitle")}
          </ThemedText>
        </View>
      </>
    );
  }

  // 비디오 필터링 후 비디오가 없을 때
  if (filteredVideos.length === 0 && videos.length > 0) {
    return (
      <>
        {renderModals()}
        {renderHeaderBar()}
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="filter-off-outline"
            size={80}
            color="#cbd5e1"
          />
          <ThemedText style={styles.emptyTitle}>
            {t("downloads.filterEmptyTitle")}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            {t("downloads.filterEmptySubtitle")}
          </ThemedText>
        </View>
      </>
    );
  }

  return (
    <>
      {renderModals()}
      {renderHeaderBar()}

      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <BannerAd
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.LARGE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
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
    backgroundColor: "#0f172a",
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
    backgroundColor: "#0f172a",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
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
    backgroundColor: "#0f172a",
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
    backgroundColor: "#fff",
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
    gap: 8,
  },
  // Toggle Button
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginBottom: 8,
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
  videoTypeButtonsScrollContainer: {
    marginVertical: 0,
    marginBottom: 8,
  },
  videoTypeButtonsContainer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "transparent",
  },
  videoTypeButton: {
    paddingHorizontal: 16,
    // paddingVertical: 8,
    borderRadius: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalMessage: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 4,
    backgroundColor: "#1d8fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
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
});
