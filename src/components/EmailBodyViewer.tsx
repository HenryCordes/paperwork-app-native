import { useEffect } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import { RichText, useEditorBridge } from "@10play/tentap-editor";

import { Colors } from "@/constants/theme";

interface EmailBodyViewerProps {
  html: string;
}

export function EmailBodyViewer({ html }: EmailBodyViewerProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const editor = useEditorBridge({
    editable: false,
    initialContent: html || "<p></p>",
  });

  useEffect(() => {
    editor.injectCSS(
      `body { background-color: ${colors.background}; color: ${colors.text}; }`,
      "theme",
    );
  }, [editor, colors.background, colors.text]);

  return (
    <View style={styles.container} testID="email-body-viewer">
      <RichText editor={editor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 160 },
});
