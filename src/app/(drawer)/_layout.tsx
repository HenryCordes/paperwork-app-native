import { Drawer } from "expo-router/drawer";
import { useRouter, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View, StyleSheet, useColorScheme } from "react-native";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem } from "expo-router/drawer";

import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

interface MenuItem {
  label: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
}

// Hrefs (leading slash), not bare route names: these screens live inside the
// nested (tabs) navigator, which a bare drawer-level navigate("invoices")
// cannot resolve. expo-router's router resolves the href to the nested screen.
const MENU_ITEMS: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "stats-chart" },
  { label: "Kosten", href: "/expenses", icon: "wallet-outline" },
  { label: "Facturen", href: "/invoices", icon: "document-text-outline" },
  { label: "Emails", href: "/emails", icon: "mail-outline" },
  { label: "Contacten", href: "/contacts", icon: "people-outline" },
  { label: "Belasting", href: "/taxes", icon: "calculator-outline" },
  { label: "Notificaties", href: "/notifications", icon: "notifications-outline" },
];

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { logout } = useAuth();

  const go = (href: Href) => {
    router.navigate(href);
    props.navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.background }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Paperwork</Text>
      </View>

      <DrawerItem
        label="Profiel"
        icon={({ size }) => (
          <Ionicons name="person-circle-outline" size={size} color={colors.text} />
        )}
        labelStyle={{ color: colors.text }}
        onPress={() => go("/profile")}
      />

      {MENU_ITEMS.map((item) => (
        <DrawerItem
          key={item.href as string}
          label={item.label}
          icon={({ size }) => (
            <Ionicons name={item.icon} size={size} color={colors.text} />
          )}
          labelStyle={{ color: colors.text }}
          onPress={() => go(item.href)}
        />
      ))}

      <DrawerItem
        label="Uitloggen"
        icon={({ size }) => (
          <Ionicons name="log-out-outline" size={size} color={colors.danger} />
        )}
        labelStyle={{ color: colors.danger }}
        onPress={() => {
          logout();
        }}
      />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: "Paperwork" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});
