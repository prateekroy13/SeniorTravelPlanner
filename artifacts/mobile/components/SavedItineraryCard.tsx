import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SavedItinerary } from "@/context/SavedItinerariesContext";

interface SavedItineraryCardProps {
  itinerary: SavedItinerary;
  onPress: (itinerary: SavedItinerary) => void;
  onDelete: (id: string) => void;
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function SavedItineraryCard({ itinerary, onPress, onDelete }: SavedItineraryCardProps) {
  const data = itinerary.generatedData as any;

  return (
    <TouchableOpacity
      onPress={() => onPress(itinerary)}
      activeOpacity={0.9}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.locationIcon}>
          <Feather name="map" size={18} color={Colors.light.primary} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {itinerary.title}
          </Text>
          <Text style={styles.location}>
            {itinerary.city}, {itinerary.country}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(itinerary.id)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={16} color={Colors.light.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={13} color={Colors.light.textSecondary} />
          <Text style={styles.statText}>{itinerary.days} days</Text>
        </View>
        <View style={styles.statItem}>
          <Feather name="sun" size={13} color={Colors.light.textSecondary} />
          <Text style={styles.statText}>{itinerary.travelMonth}</Text>
        </View>
        {data?.seniorFriendlyScore && (
          <View style={styles.statItem}>
            <Feather name="star" size={13} color={Colors.light.accent} />
            <Text style={styles.statText}>{data.seniorFriendlyScore}/10</Text>
          </View>
        )}
      </View>

      {data?.overview && (
        <Text style={styles.overview} numberOfLines={2}>
          {data.overview}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.savedDate}>Saved {formatDate(itinerary.savedAt)}</Text>
        <View style={styles.viewRow}>
          <Text style={styles.viewText}>View itinerary</Text>
          <Feather name="chevron-right" size={14} color={Colors.light.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
    }),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  location: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  deleteBtn: {
    padding: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  overview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    paddingTop: 8,
  },
  savedDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.primary,
  },
});
