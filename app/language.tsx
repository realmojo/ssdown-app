import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { LanguageCode, useLocale } from "./context/locale";

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "jp", label: "日本語" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "es", label: "Español" },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLocale();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<LanguageCode | null>(
    language ?? "en"
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Hide the header entirely on language selection */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("language.selectLanguage")}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t("language.chooseLanguage")}
        </ThemedText>
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              selected === item.code && styles.cardActive,
              pressed && styles.cardPressed,
              saving && styles.cardDisabled,
            ]}
            android_ripple={{ color: "rgba(245,215,110,0.12)" }}
            onPress={() => setSelected(item.code)}
            disabled={saving}
          >
            <ThemedText style={styles.cardLabel}>{item.label}</ThemedText>
            <ThemedText style={styles.cardCode}>{item.code}</ThemedText>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <Pressable
        style={({ pressed }) => [
          styles.nextButton,
          (!selected || saving) && styles.nextButtonDisabled,
          pressed && selected && !saving && styles.nextButtonPressed,
        ]}
        android_ripple={{ color: "rgba(245,215,110,0.12)" }}
        disabled={!selected || saving}
        onPress={async () => {
          if (!selected) return;
          setSaving(true);
          try {
            await setLanguage(selected);
            router.replace("/(tabs)/home");
          } catch {
            // error already logged
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#0b1220" />
        ) : (
          <ThemedText style={styles.nextButtonText}>Next</ThemedText>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardActive: {
    borderColor: "#f5d76e",
    backgroundColor: "#0f172a",
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  cardCode: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  nextButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#f5d76e",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  nextButtonPressed: {
    opacity: 0.9,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: "#0b1220",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
