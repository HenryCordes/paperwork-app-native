import { useEffect, useRef, type RefObject } from "react";
import {
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";

import { Spacing } from "@/constants/theme";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

// How far below the top of the scroll viewport a parked element is kept.
const TOP_MARGIN = Spacing.four;
// Delay before scrolling so the keyboard-height padding below has been committed
// and the target offset is actually reachable.
const SETTLE_MS = 60;

/** Anything we can measure to park it near the top of the viewport. */
interface Measurable {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
}

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /**
   * A zero-height anchor rendered just above a non-native input. The tentap
   * email editor is a WebView, so React Native never sees it as "focused"; when
   * the keyboard opens with no native input focused, this anchor is parked at
   * the top of the viewport so the editor below it is fully in view rather than
   * scrolled past to whatever sits underneath it.
   */
  focusAnchorRef?: RefObject<View | null>;
}

/**
 * ScrollView preconfigured for the app's edit forms so a focused field is never
 * left behind the keyboard.
 *
 * The bottom padding tracks the real keyboard height (read from
 * {@link useKeyboardHeight}) so any field can be scrolled clear of it, and when
 * the keyboard opens the focused field — a native TextInput, or the editor via
 * {@link KeyboardAwareScrollViewProps.focusAnchorRef} — is parked near the top
 * of the viewport, the way the old edit forms behaved.
 */
export function KeyboardAwareScrollView({
  contentContainerStyle,
  onScroll,
  focusAnchorRef,
  children,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const wasOpen = useRef(false);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (keyboardHeight === 0) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) {
      return;
    }
    wasOpen.current = true;

    const timer = setTimeout(() => {
      const scrollHost = scrollRef.current?.getNativeScrollRef();
      // A native input is focused for text fields; for the WebView editor none
      // is, so fall back to the anchor rendered just above it.
      const target: Measurable | null =
        TextInput.State.currentlyFocusedInput() ?? focusAnchorRef?.current;
      if (!scrollHost || !target) {
        return;
      }

      scrollHost.measureInWindow((_hostX, hostY) => {
        target.measureInWindow((_targetX, targetY) => {
          const delta = targetY - (hostY + TOP_MARGIN);
          if (delta > 0) {
            scrollRef.current?.scrollTo({
              y: scrollOffset.current + delta,
              animated: true,
            });
          }
        });
      });
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [keyboardHeight, focusAnchorRef]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  };

  return (
    <ScrollView
      ref={scrollRef}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: keyboardHeight + Spacing.four },
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
