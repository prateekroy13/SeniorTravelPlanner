import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { ScoreRing } from "./ui/ScoreRing";

interface Destination {
  id: string;
  city: string;
  country: string;
  description: string;
  seniorFriendlyScore: number;
  highlights: string[];
  bestMonths: string[];
  terrain: string;
  imageUrl?: string | null;
}

interface DestinationCardProps {
  destination: Destination;
  onPress: (destination: Destination) => void;
  variant?: "horizontal" | "vertical";
}

const GRADIENT_PALETTES: [string, string][] = [
  ["#1A6B4A", "#0D4A32"],
  ["#2E5D8A", "#1A3A5C"],
  ["#7B3F8A", "#4A2055"],
  ["#C4622D", "#8B3A1A"],
  ["#1A7B7B", "#0E4E4E"],
  ["#6B4A1A", "#4A3010"],
  ["#2D5A1A", "#1A3A0E"],
  ["#8A3A2E", "#5C1A14"],
];

function getGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENT_PALETTES[Math.abs(hash) % GRADIENT_PALETTES.length];
}

export function DestinationCard({ destination, onPress, variant = "vertical" }: DestinationCardProps) {
  const gradient = getGradient(destination.id);

  if (variant === "horizontal") {
    return (
      <TouchableOpacity
        onPress={() => onPress(destination)}
        activeOpacity={0.92}
        style={styles.horizontal}
      >
        <LinearGradient colors={gradient} style={styles.horizontalImage}>
          <Feather name="map-pin" size={22} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
        <View style={styles.horizontalContent}>
          <Text style={styles.city}>{destination.city}</Text>
          <Text style={styles.country}>{destination.country}</Text>
          <Text style={styles.terrain} numberOfLines={1}>
            {destination.terrain}
          </Text>
        </View>
        <ScoreRing score={destination.seniorFriendlyScore} size={44} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(destination)}
      activeOpacity={0.92}
      style={styles.card}
    >
      <LinearGradient
        colors={gradient}
        style={styles.cardImage}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.scoreOverlay}>
          <Feather name="star" size={12} color="#fff" />
          <Text style={styles.scoreText}>{destination.seniorFriendlyScore}/10</Text>
        </View>
        <View style={styles.locationTag}>
          <Feather name="map-pin" size={12} color="rgba(255,255,255,0.9)" />
          <Text style={styles.locationText}>{destination.country}</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardContent}>
        <Text style={styles.city}>{destination.city}</Text>
        <Text style={styles.descriptionText} numberOfLines={2}>
          {destination.description}
        </Text>

        <View style={styles.highlightRow}>
          {destination.highlights.slice(0, 2).map((h, i) => (
            <View key={i} style={styles.highlight}>
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Ionicons name="calendar-outline" size={12} color={Colors.light.textTertiary} />
          <Text style={styles.bestMonths}>
            Best: {destination.bestMonths.slice(0, 2).join(", ")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      web: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
    }),
  },
  cardImage: {
    height: 120,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
  },
  scoreOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  cardContent: {
    padding: 14,
    gap: 8,
  },
  city: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  country: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  terrain: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  highlightRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  highlight: {
    backgroundColor: Colors.light.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  highlightText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.primary,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestMonths: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  horizontal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  horizontalImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalContent: {
    flex: 1,
    gap: 2,
  },
});
