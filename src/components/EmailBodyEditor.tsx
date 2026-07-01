import {
  CoreBridge,
  RichText,
  TenTapStartKit,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { emailBodyCSS } from "@/utils/emailBodyCss";

interface EmailBodyEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  /**
   * Zero-height anchor placed just above the text area. KeyboardAwareScrollView
   * parks it near the top of the viewport when the editor is focused, so the
   * text area lands in view above the keyboard.
   */
  anchorRef?: RefObject<View | null>;
}

export function EmailBodyEditor({
  initialContent,
  onChange,
  anchorRef,
}: EmailBodyEditorProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const bodyCSS = emailBodyCSS(colors);

  // configureCSS bakes the theme colors into the editor's initial HTML, so the
  // very first paint already has the right surface. The injectCSS effect below
  // only covers live scheme changes; on a cold render it races the WebView load
  // and gets dropped, which is what left the text invisible until first focus.
  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialContent || "<p></p>",
    bridgeExtensions: [...TenTapStartKit, CoreBridge.configureCSS(bodyCSS)],
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const html = useEditorContent(editor, { type: "html" });

  // Push live HTML up to the form. useEditorContent returns undefined until the
  // WebView bundle is ready; ignore that first undefined so we don't clobber
  // the form's initial value.
  // onChange is stored in a ref to avoid re-firing when the parent re-renders
  // with a new inline callback reference.
  useEffect(() => {
    if (html !== undefined) {
      onChangeRef.current(html);
    }
  }, [html]);

  // Re-apply the surface colors on every scheme change (keyed 'theme' so it
  // replaces rather than stacks). The initial paint is handled by configureCSS.
  useEffect(() => {
    editor.injectCSS(bodyCSS, "theme");
  }, [editor, bodyCSS]);

  const insertImage = () => {
    const url = imageUrl.trim();
    if (url) {
      editor.setImage(url);
    }
    setImageUrl("");
    setImageModalOpen(false);
  };

  return (
    <View
      style={[styles.container, { borderColor: colors.border }]}
      testID="email-body-editor"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbarScroll}
      >
        <View style={styles.toolbar}>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleBold()}
          >
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              B
            </Text>
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleItalic()}
          >
            <Text
              style={[
                styles.toolbarButtonText,
                { color: colors.text, fontStyle: "italic" },
              ]}
            >
              I
            </Text>
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleUnderline()}
          >
            <Text
              style={[
                styles.toolbarButtonText,
                { color: colors.text, textDecorationLine: "underline" },
              ]}
            >
              U
            </Text>
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleStrike()}
          >
            <Text
              style={[
                styles.toolbarButtonText,
                { color: colors.text, textDecorationLine: "line-through" },
              ]}
            >
              S
            </Text>
          </Pressable>
          <View style={styles.toolbarSeparator} />
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleHeading(1)}
          >
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              H1
            </Text>
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleHeading(2)}
          >
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              H2
            </Text>
          </Pressable>
          <View style={styles.toolbarSeparator} />
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleBulletList()}
          >
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              •
            </Text>
          </Pressable>
          <Pressable
            style={styles.toolbarButton}
            onPress={() => editor.toggleOrderedList()}
          >
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              1.
            </Text>
          </Pressable>
          <View style={styles.toolbarSeparator} />
          <Pressable style={styles.toolbarButton} onPress={() => editor.undo()}>
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              ↩
            </Text>
          </Pressable>
          <Pressable style={styles.toolbarButton} onPress={() => editor.redo()}>
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              ↪
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.editorContainer, { borderColor: colors.border }]}>
        <View ref={anchorRef} />
        <RichText
          editor={editor}
          style={[styles.rich, { backgroundColor: colors.background }]}
        />
      </View>
      <Pressable
        testID="insert-image-button"
        style={[styles.imageButton, { borderColor: colors.border }]}
        onPress={() => setImageModalOpen(true)}
      >
        <Text style={{ color: colors.primary }}>Afbeelding invoegen</Text>
      </Pressable>

      <Modal transparent visible={imageModalOpen} animationType="fade">
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Afbeelding-URL
            </Text>
            <TextInput
              testID="image-url-input"
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
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
  container: {
    minHeight: 280,
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
  },
  editorContainer: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  rich: { minHeight: 220 },
  toolbarScroll: {
    flexDirection: "row",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  toolbarButton: {
    padding: Spacing.two,
    borderRadius: 4,
    minWidth: 36,
    alignItems: "center",
  },
  toolbarButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  toolbarSeparator: {
    width: 1,
    height: 24,
    backgroundColor: "#d1d1d6",
    marginHorizontal: Spacing.one,
  },
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
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.four,
  },
});
