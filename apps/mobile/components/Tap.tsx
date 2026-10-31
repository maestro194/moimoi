import {
  TouchableOpacity,
  type AccessibilityRole,
  type Insets,
  type TouchableOpacityProps,
} from 'react-native';

/**
 * Touch area added around every control unless the caller passes hitSlop. A fixed inset instead of
 * measuring each control: measuring needs onLayout + a re-render per control, which shows up as
 * dropped frames when list rows mount during scrolling. 8pt each side brings the common ~28pt chip
 * to the 44pt minimum target.
 */
const DEFAULT_HIT_SLOP: Insets = { top: 8, bottom: 8, left: 8, right: 8 };

export interface TapProps extends Omit<TouchableOpacityProps, 'role'> {
  /** What a screen reader announces. Required so icon-only buttons always have a name. */
  label: string;
  role?: AccessibilityRole;
  hint?: string;
  selected?: boolean;
  checked?: boolean;
  expanded?: boolean;
}

/**
 * TouchableOpacity with accessibility built in: a label and role, plus selected/checked/expanded/disabled
 * state. hitSlop never extends past the parent, and overlapping siblings take precedence.
 */
export function Tap({
  label, role = 'button', hint, selected, checked, expanded,
  disabled, hitSlop = DEFAULT_HIT_SLOP, accessibilityState, ...rest
}: TapProps) {
  return (
    <TouchableOpacity
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop}
      accessible
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled, selected, checked, expanded }}
    />
  );
}
