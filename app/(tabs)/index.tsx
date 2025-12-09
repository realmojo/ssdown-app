import {
  FontAwesome,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

export default function HomeScreen() {
  const [url, setUrl] = useState(
    "https://www.tiktok.com/@hahahago99/video/7553175660416519444"
  );
  const [showResult, setShowResult] = useState(false);
  const downloadResult = useMemo(
    () => ({
      thumbnail:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      user: { name: "qfdwcvdsv", handle: "@qwfewdev22" },
      date: "2025. 11. 14.",
      tag: "#movie",
      stats: [
        { key: "views", icon: "eye-outline", value: "5.3M", color: "#7a8699" },
        {
          key: "likes",
          icon: "heart-outline",
          value: "100.8K",
          color: "#ff2d87",
        },
        {
          key: "comments",
          icon: "message-processing-outline",
          value: "303",
          color: "#0a7cff",
        },
        {
          key: "shares",
          icon: "share-outline",
          value: "2.6K",
          color: "#1eb980",
        },
      ],
      downloads: [
        { id: "480-a", label: "480p" },
        { id: "480-b", label: "480p" },
        { id: "360-a", label: "360p" },
        { id: "360-b", label: "360p" },
        { id: "240", label: "240p" },
      ],
    }),
    []
  );
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
            ]}
            android_ripple={{ color: "#66b8ff" }}
            onPress={() => setShowResult(true)}
          >
            <ThemedText style={styles.primaryButtonText}>
              Download Video
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.surface}>
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
        </View>

        {showResult && (
          <View style={styles.surface}>
            <View style={styles.mediaCard}>
              <Image
                source={downloadResult.thumbnail}
                style={styles.preview}
                contentFit="cover"
              />
            </View>

            <View style={styles.profileRow}>
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.profileName}>
                  {downloadResult.user.name}
                </ThemedText>
                <ThemedText style={styles.profileHandle}>
                  {downloadResult.user.handle}
                </ThemedText>
              </View>
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
            </View>

            <ThemedText style={styles.tagText}>{downloadResult.tag}</ThemedText>

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

            <View style={styles.downloadHeader}>
              <ThemedText style={styles.sectionTitle}>
                DOWNLOAD OPTIONS
              </ThemedText>
            </View>

            <View style={styles.downloadList}>
              {downloadResult.downloads.map((item) => (
                <View key={item.id} style={styles.downloadRow}>
                  <View style={styles.dot} />
                  <ThemedText style={styles.quality}>{item.label}</ThemedText>
                  <Pressable
                    style={({ pressed }) => [
                      styles.downloadButton,
                      pressed && styles.downloadButtonPressed,
                    ]}
                    android_ripple={{ color: "#ffd6f2" }}
                    onPress={() => {}}
                  >
                    <ThemedText style={styles.downloadText}>
                      Download
                    </ThemedText>
                    <MaterialIcons
                      name="file-download"
                      size={20}
                      color="#e6007a"
                    />
                  </Pressable>
                </View>
              ))}
            </View>
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
    letterSpacing: 1,
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
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadButtonPressed: {
    opacity: 0.85,
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
});
