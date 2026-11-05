import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { foilTagLabel, type FoilInfo, type FoilTier } from '@maimai-suite/core';
import { useFoilClock } from './FoilClock';

type GradStop = [offset: number, color: string, opacity: number];

interface TierLook {
  edge: number;
  spinMs: number;
  sweepMs: number;
  edgeStops: string[];
  tint: GradStop[];
  band: GradStop[];
  glow: string;
  rating: string;
}

// Same colours as the web foil (apps/web/components/foil-card.module.css)
const LOOK: Record<FoilTier, TierLook> = {
  secret: {
    edge: 3, spinMs: 5000, sweepMs: 4000,
    edgeStops: ['#ff8fd8', '#ffe08a', '#8affc1', '#8ad8ff', '#c79bff', '#ff8fd8'],
    tint: [[0, '#ff8fd8', 0.16], [0.5, '#8affc1', 0.1], [1, '#c79bff', 0.16]],
    band: [[0.38, '#ff8fd8', 0], [0.42, '#ff8fd8', 0.4], [0.445, '#ffe08a', 0.4], [0.47, '#8affc1', 0.4], [0.495, '#8ad8ff', 0.4], [0.52, '#c79bff', 0.4], [0.56, '#c79bff', 0]],
    glow: '0 0 28px -4px rgba(199, 155, 255, 0.8)',
    rating: '#e3b4ff',
  },
  gold: {
    edge: 2.5, spinMs: 11000, sweepMs: 5000,
    edgeStops: ['#8a5a12', '#ffe49a', '#c8922a', '#fff3c4', '#a8701c', '#ffe49a', '#8a5a12'],
    tint: [[0, '#ffe49a', 0.12], [0.5, '#c8922a', 0.06], [1, '#fff3c4', 0.12]],
    band: [[0.39, '#c8922a', 0], [0.43, '#c8922a', 0.3], [0.46, '#ffe49a', 0.4], [0.475, '#fffae1', 0.42], [0.495, '#ffd678', 0.34], [0.525, '#a8701c', 0.28], [0.56, '#a8701c', 0]],
    glow: '0 0 22px -6px rgba(245, 196, 81, 0.75)',
    rating: '#f5c451',
  },
  silver: {
    edge: 2, spinMs: 16000, sweepMs: 6500,
    edgeStops: ['#7d8796', '#eef2f7', '#9aa3b2', '#ffffff', '#7d8796', '#eef2f7', '#7d8796'],
    tint: [[0, '#eef2f7', 0.08], [0.5, '#9aa3b2', 0.03], [1, '#ffffff', 0.08]],
    band: [[0.4, '#c8d4ff', 0], [0.44, '#c8d4ff', 0.24], [0.465, '#ffffff', 0.28], [0.49, '#ffd6f0', 0.24], [0.515, '#c8fff0', 0.22], [0.55, '#c8fff0', 0]],
    glow: '0 0 16px -8px rgba(223, 230, 239, 0.7)',
    rating: '#dfe6ef',
  },
};

const FRESH_BLUE = '127, 178, 255';
/** Fresh-glow pulse: 1 -> 0.55 -> 1. */
const PULSE_MS = 2600;
const ease = Easing.inOut(Easing.ease);

/** Position in a back-and-forth cycle of `period` ms, eased, 0..1..0. */
function pingPong(t: number, period: number): number {
  'worklet';
  const u = (t % period) / period;
  return ease(u < 0.5 ? u * 2 : 2 - u * 2);
}

/** Rating number colour for a foil card (mobile uses a solid tier colour instead of gradient text). */
export function foilRatingColor(foil?: FoilInfo | null): string | undefined {
  return foil?.tier ? LOOK[foil.tier].rating : undefined;
}

/** True when the card needs a FoilFrame at all. */
export const hasFoil = (foil?: FoilInfo | null): foil is FoilInfo => !!foil && (!!foil.tier || foil.freshness > 0 || foil.isTop1);

function Gradient({ id, stops, x2 = 1, y2 = 1 }: { id: string; stops: GradStop[]; x2?: number; y2?: number }) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
          {stops.map(([o, c, a], i) => <Stop key={i} offset={o} stopColor={c} stopOpacity={a} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

interface Props {
  foil: FoilInfo;
  /** Corner radius of the card inside; the frame adds the edge width around it. */
  radius: number;
  /** Layout of the whole card in its row (width, margins). */
  style?: StyleProp<ViewStyle>;
  /** Key of the list row holding the card; it stops updating while that row is off screen. */
  rowKey?: string;
  children: ReactNode;
}

/**
 * B50 card foil. Each pose (edge angle, band position, glow) is a function of the screen's shared
 * FoilClock, so every card of a tier is in the same phase, also after scrolling back into view.
 * Moving parts are transform or opacity only, computed on the UI thread. Without a running clock
 * (tab not focused, reduced motion, "Foil animation" off, or no FoilClockProvider) the foil holds still.
 */
export function FoilFrame({ foil, radius, style, rowKey, children }: Props) {
  const look = foil.tier ? LOOK[foil.tier] : null;
  const fresh = foil.freshness;
  const clockCtx = useFoilClock();
  const clock = clockCtx?.clock;
  const visible = rowKey ? clockCtx?.visible : null;

  // Measured once; the edge square only needs to cover the frame's diagonal while it turns
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
  };
  const edgeSide = Math.ceil(Math.hypot(size.w, size.h)) + 2;
  const w = size.w;

  const edgeStyle = useAnimatedStyle(() => {
    if (!look || !clock) return {};
    if (visible && rowKey && !visible.value[rowKey]) return {};
    return { transform: [{ rotate: `${((clock.value % look.spinMs) / look.spinMs) * 360}deg` }] };
  });
  // The band is three cards wide and slides from one side to the other (center from about -64% to 146%)
  const bandStyle = useAnimatedStyle(() => {
    if (!look || !clock) return { transform: [{ translateX: -1.05 * w }] };
    if (visible && rowKey && !visible.value[rowKey]) return {};
    return { transform: [{ translateX: (pingPong(clock.value, look.sweepMs) * 2 - 1) * 1.05 * w }] };
  });
  const glowStyle = useAnimatedStyle(() => {
    if (!clock || fresh <= 0) return { opacity: 1 };
    if (visible && rowKey && !visible.value[rowKey]) return {};
    return { opacity: 1 - 0.45 * pingPong(clock.value, PULSE_MS) };
  });

  const edge = look?.edge ?? 0;

  return (
    <View style={style}>
      {look ? (
        <View
          onLayout={onLayout}
          style={[styles.frame, { padding: edge, borderRadius: radius + edge, boxShadow: look.glow }, foil.isTop1 && styles.top1]}
        >
          {w > 0 && (
            <Animated.View
              style={[styles.edge, { width: edgeSide, height: edgeSide, marginLeft: -edgeSide / 2, marginTop: -edgeSide / 2 }, edgeStyle]}
              pointerEvents="none"
            >
              <Gradient id="edge" stops={look.edgeStops.map((c, i, a) => [i / (a.length - 1), c, 1])} />
            </Animated.View>
          )}
          <View style={styles.content}>{children}</View>
          <View style={[StyleSheet.absoluteFill, styles.overlay, { borderRadius: radius + edge }]} pointerEvents="none">
            <Gradient id="tint" stops={look.tint} />
          </View>
          {w > 0 && (
            <Animated.View style={[styles.band, { width: w * 3, left: -w }, bandStyle]} pointerEvents="none">
              <Gradient id="band" stops={look.band} x2={1} y2={0.45} />
            </Animated.View>
          )}
        </View>
      ) : (
        <View style={foil.isTop1 ? [styles.top1, { borderRadius: radius }] : undefined}>{children}</View>
      )}

      {fresh > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, glowStyle, {
            borderRadius: radius + edge + 3,
            borderColor: `rgba(${FRESH_BLUE}, ${fresh.toFixed(2)})`,
            boxShadow: `0 0 ${Math.round(4 + 26 * fresh)}px -4px rgba(${FRESH_BLUE}, ${fresh.toFixed(2)})`,
          }]}
        />
      )}
      {foil.isTop1 && <Text style={[styles.badge, styles.crown]}>★ B50 #1</Text>}
      {foil.tagged && <Text style={[styles.badge, styles.tag]}>{foilTagLabel(foil)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  content: {
    zIndex: 1,
  },
  edge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  overlay: {
    zIndex: 2,
    mixBlendMode: 'screen',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 3,
    mixBlendMode: 'screen',
  },
  glow: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
    borderWidth: 2,
    zIndex: 4,
  },
  top1: {
    borderWidth: 2,
    borderColor: '#ffe49a',
  },
  badge: {
    position: 'absolute',
    top: -8,
    zIndex: 5,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  tag: {
    right: 10,
    backgroundColor: '#7fb2ff',
    color: '#061423',
  },
  crown: {
    left: 10,
    backgroundColor: '#e8b64a',
    color: '#2a1d00',
  },
});
