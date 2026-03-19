import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Colors from "@/constants/colors";

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 56, label = "Score" }: ScoreRingProps) {
  const stroke = 4;
  const radius = (size - stroke * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(score / 10, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  const color =
    score >= 8.5
      ? Colors.light.success
      : score >= 7
      ? Colors.light.accent
      : Colors.light.warning;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          stroke={Colors.light.borderLight}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.score, { color }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
