import {
  CoreBridge,
  RichText,
  TenTapStartKit,
  useEditorBridge,
} from "@10play/tentap-editor";
import { useEffect } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { emailBodyCSS } from "@/utils/emailBodyCss";

interface EmailBodyViewerProps {
  html: string;
}

export function EmailBodyViewer({ html }: EmailBodyViewerProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const bodyCSS = emailBodyCSS(colors);

  // configureCSS bakes the theme colors into the initial render so the read-only
  // surface paints correctly on the first frame. Injecting after mount alone
  // races the WebView load and left the viewer showing tentap's default light
  // theme (white background, dark text) even in dark mode.
  const editor = useEditorBridge({
    editable: false,
    initialContent: html || "<p></p>",
    bridgeExtensions: [...TenTapStartKit, CoreBridge.configureCSS(bodyCSS)],
  });

  useEffect(() => {
    editor.injectCSS(bodyCSS, "theme");
  }, [editor, bodyCSS]);

  return (
    <View style={styles.container} testID="email-body-viewer">
      <RichText editor={editor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 160 },
});
