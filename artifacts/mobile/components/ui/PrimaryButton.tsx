import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: "filled" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  variant = "filled",
  size = "md",
}: PrimaryButtonProps) {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.base,
    size === "sm" && styles.sm,
    size === "md" && styles.md,
    size === "lg" && styles.lg,
    variant === "filled" && styles.filled,
    variant === "outline" && styles.outline,
    variant === "ghost" && styles.ghost,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    size === "sm" && styles.labelSm,
    size === "md" && styles.labelMd,
    size === "lg" && styles.labelLg,
    variant === "outline" && styles.labelOutline,
    variant === "ghost" && styles.labelGhost,
    isDisabled && styles.labelDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "filled" ? "#fff" : Colors.light.primary}
          size="small"
        />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sm: { paddingVertical: 10, paddingHorizontal: 18 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 32 },
  filled: {
    backgroundColor: Colors.light.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  labelSm: { fontSize: 14 },
  labelMd: { fontSize: 16 },
  labelLg: { fontSize: 18 },
  labelOutline: { color: Colors.light.primary },
  labelGhost: { color: Colors.light.primary },
  labelDisabled: {},
});
