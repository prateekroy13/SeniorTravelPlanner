import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { usePreferences } from "@/context/PreferencesContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

type LocationType = "spot" | "restaurant";

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();
  const { preferences } = usePreferences();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [image, setImage] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(preferences.name || "");
  const [caption, setCaption] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("spot");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = locationName.trim().length > 0 && city.trim().length > 0 && country.trim().length > 0 && !isSubmitting;

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        if (asset.base64) {
          setImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setImage(asset.uri);
        }
      }
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library to share a spark.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.5,
      base64: true,
    });

    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      if (asset.base64) {
        setImage(`data:image/jpeg;base64,${asset.base64}`);
      } else if (asset.uri) {
        setImage(asset.uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const body = {
        authorName: authorName.trim() || "Traveler",
        imageData: image,
        caption: caption.trim(),
        locationName: locationName.trim(),
        locationType,
        destinationCity: city.trim(),
        destinationCountry: country.trim(),
      };

      const res = await fetch(`${BASE_URL}/api/sparks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Upload failed");

      await queryClient.invalidateQueries({ queryKey: ["sparks"] });

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/sparks");
      }
    } catch {
      Alert.alert("Oops!", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/sparks");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share a Spark ⚡</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.photoArea} onPress={pickImage} activeOpacity={0.85}>
          {image ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.photoChangeOverlay}>
                <Feather name="camera" size={18} color="#fff" />
                <Text style={styles.photoChangeText}>Change photo</Text>
              </View>
            </View>
          ) : (
            <LinearGradient colors={["#1A1A2E", "#16213E"]} style={styles.photoPlaceholder}>
              <Feather name="camera" size={36} color="rgba(255,255,255,0.3)" />
              <Text style={styles.photoPlaceholderTitle}>Add a Photo</Text>
              <Text style={styles.photoPlaceholderSub}>Optional — tap to select from your gallery</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>WHAT ARE YOU SHARING?</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, locationType === "spot" && styles.typeBtnActive]}
              onPress={() => setLocationType("spot")}
              activeOpacity={0.8}
            >
              <Text style={styles.typeBtnEmoji}>📍</Text>
              <Text style={[styles.typeBtnLabel, locationType === "spot" && styles.typeBtnLabelActive]}>
                A Spot / Place
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, locationType === "restaurant" && styles.typeBtnActiveFood]}
              onPress={() => setLocationType("restaurant")}
              activeOpacity={0.8}
            >
              <Text style={styles.typeBtnEmoji}>🍽️</Text>
              <Text style={[styles.typeBtnLabel, locationType === "restaurant" && styles.typeBtnLabelActive]}>
                A Restaurant
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>
            {locationType === "restaurant" ? "RESTAURANT NAME" : "PLACE / ATTRACTION NAME"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={locationType === "restaurant" ? "e.g. Trattoria Roma" : "e.g. Belém Tower"}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={locationName}
            onChangeText={setLocationName}
            returnKeyType="next"
          />

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>CITY</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Lisbon"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={city}
            onChangeText={setCity}
            returnKeyType="next"
          />

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>COUNTRY</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Portugal"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={country}
            onChangeText={setCountry}
            returnKeyType="next"
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>YOUR CAPTION (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.captionInput]}
            placeholder="Share what made this special…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Margaret T."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={authorName}
            onChangeText={setAuthorName}
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
        >
          <LinearGradient
            colors={canSubmit ? [Colors.light.primary, "#0D4A33"] : ["#333", "#222"]}
            style={styles.postBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.postBtnEmoji}>⚡</Text>
                <Text style={styles.postBtnText}>Share Your Spark</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    minWidth: 60,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  photoArea: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
  },
  photoPreview: {
    flex: 1,
    position: "relative",
  },
  photoChangeOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  photoChangeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderStyle: "dashed",
  },
  photoPlaceholderTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
  },
  photoPlaceholderSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    maxWidth: 220,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typeToggle: {
    flexDirection: "row",
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  typeBtnActive: {
    backgroundColor: "rgba(26,107,74,0.25)",
    borderColor: Colors.light.primary,
  },
  typeBtnActiveFood: {
    backgroundColor: "rgba(196,98,45,0.25)",
    borderColor: "#C4622D",
  },
  typeBtnEmoji: {
    fontSize: 24,
  },
  typeBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
  typeBtnLabelActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  captionInput: {
    minHeight: 80,
    borderBottomWidth: 0,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  postBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 6,
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  postBtnEmoji: {
    fontSize: 20,
  },
  postBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
