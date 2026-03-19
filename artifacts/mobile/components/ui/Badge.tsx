import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Colors from "@/constants/colors";

interface BadgeProps {
  label: string;
  variant?: "primary" | "accent" | "neutral" | "success";
  style?: ViewStyle;
}

export function Badge({ label, variant = "primary", style }: BadgeProps) {
  const bg =
    variant === "primary"
      ? Colors.light.primaryPale
      : variant === "accent"
      ? Colors.light.accentLight
      : variant === "success"
      ? "#DCFCE7"
      : Colors.light.surfaceSecondary;

  const color =
    variant === "primary"
      ? Colors.light.primary
      : variant === "accent"
      ? "#92400E"
      : variant === "success"
      ? "#166534"
      : Colors.light.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
