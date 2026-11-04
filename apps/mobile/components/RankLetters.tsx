import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { rankGlyphs } from '@maimai-suite/core';
import { COLORS } from '@/constants/Theme';

/**
 * A rank lettered as on the web B50: each letter in its own colour (gold, sky, pink, grey),
 * the "+" smaller, with a dark edge so it reads on jackets and pills alike.
 */
export function RankLetters({ label, style }: { label: string; style?: StyleProp<TextStyle> }) {
  const plusSize = Math.round((StyleSheet.flatten(style)?.fontSize ?? 12) * 0.7);
  return (
    <Text style={[{ textShadowColor: COLORS.rankOutline, textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 } }, style]}
      accessibilityLabel={label}>
      {rankGlyphs(label).map(([ch, color, plus], i) => (
        <Text key={i} style={plus ? { color, fontSize: plusSize } : { color }}>{ch}</Text>
      ))}
    </Text>
  );
}
