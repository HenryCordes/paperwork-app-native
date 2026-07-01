import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import {
  RichText,
  Toolbar,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";

import { Colors, Spacing } from "@/constants/theme";

interface EmailBodyEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
}

export function EmailBodyEditor({ initialContent, onChange }: EmailBodyEditorProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialContent || "<p></p>",
  });

  const html = useEditorContent(editor, { type: "html" });

  // Push live HTML up to the form. useEditorContent returns undefined until the
  // WebView bundle is ready; ignore that first undefined so we don't clobber
  // the form's initial value.
  useEffect(() => {
    if (html !== undefined) {
      onChange(html);
    }
  }, [html, onChange]);

  // Match the source app's dark/light editor surface. injectCSS re-applies on
  // every scheme change (keyed 'theme' so it replaces rather than stacks).
  useEffect(() => {
    editor.injectCSS(
      `body { background-color: ${colors.background}; color: ${colors.text}; }`,
      "theme",
    );
  }, [editor, colors.background, colors.text]);

  const insertImage = () => {
    const url = imageUrl.trim();
    if (url) {
      editor.setImage(url);
    }
    setImageUrl("");
    setImageModalOpen(false);
  };

  return (
    <View style={styles.container} testID="email-body-editor">
      <RichText editor={editor} style={styles.rich} />
      <Toolbar editor={editor} />
      <Pressable
        testID="insert-image-button"
        style={[styles.imageButton, { borderColor: colors.border }]}
        onPress={() => setImageModalOpen(true)}
      >
        <Text style={{ color: colors.primary }}>Afbeelding invoegen</Text>
      </Pressable>

      <Modal transparent visible={imageModalOpen} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.modalLabel, { color: colors.text }]}>Afbeelding-URL</Text>
            <TextInput
              testID="image-url-input"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              placeholder="https://..."
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setImageModalOpen(false)}>
                <Text style={{ color: colors.textSecondary }}>Annuleren</Text>
              </Pressable>
              <Pressable testID="image-url-confirm" onPress={insertImage}>
                <Text style={{ color: colors.primary }}>Invoegen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 300, gap: Spacing.two },
  rich: { minHeight: 240 },
  imageButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: Spacing.four,
  },
  modalCard: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  modalLabel: { fontSize: 14 },
  input: { borderBottomWidth: 1, paddingVertical: Spacing.two, fontSize: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.four },
});
