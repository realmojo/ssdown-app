import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

export default function DownloadGuideScreen() {
  const steps = [
    {
      title: "1. Copy",
      body: "Copy the share link (URL) of the video you want to download.",
      icon: "content-copy",
      color: "#3b82f6",
    },
    {
      title: "2. Paste",
      body: "Paste the link into the Home input field and tap the DOWNLOAD button.",
      icon: "clipboard-check-outline",
      color: "#22c55e",
    },
    {
      title: "3. Choose quality",
      body: "Press Download on the quality/bitrate option you want to save.",
      icon: "download-outline",
      color: "#e11d48",
    },
    {
      title: "4. Saved location",
      body: "Find saved videos in the ssdown album (gallery) or Downloads/ssdown folder.",
      icon: "folder-outline",
      color: "#f59e0b",
    },
  ];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "How to download videos",
          headerTitleAlign: "left",
        }}
      />
      <View style={styles.introCard}>
        <MaterialCommunityIcons
          name="movie-open-outline"
          size={28}
          color="white"
        />
        <ThemedText style={styles.introTitle}>Simple 4 steps</ThemedText>
        <ThemedText style={styles.introSubtitle}>
          Just paste a link and download right away.
        </ThemedText>
      </View>

      <View style={styles.steps}>
        {steps.map((step) => (
          <View key={step.title} style={styles.stepCard}>
            <View
              style={[styles.stepIcon, { backgroundColor: `${step.color}1A` }]}
            >
              <MaterialCommunityIcons
                name={step.icon as any}
                size={22}
                color={step.color}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
              <ThemedText style={styles.stepBody}>{step.body}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  page: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  introCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    alignItems: "flex-start",
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
  },
  introSubtitle: {
    fontSize: 14,
    color: "white",
    lineHeight: 20,
  },
  steps: {
    gap: 12,
  },
  stepCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  stepBody: {
    fontSize: 13,
    color: "white",
    lineHeight: 18,
  },
});
