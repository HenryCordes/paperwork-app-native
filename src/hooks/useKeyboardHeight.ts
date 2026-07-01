import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * The current on-screen keyboard height, or 0 when it is hidden.
 *
 * iOS emits the "will" events ahead of the show/hide animation, which lets
 * layout react in step with it; Android only reports the height reliably on the
 * "did" events.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
