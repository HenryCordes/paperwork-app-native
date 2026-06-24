import { Drawer } from "expo-router/drawer";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View, StyleSheet, useColorScheme } from "react-native";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem } from "expo-router/drawer";

import { Colors, Spacing } from "@/constants/theme";

interface MenuItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Dashboard", route: "dashboard", icon: "stats-chart" },
  { label: "Kosten", route: "expenses", icon: "wallet-outline" },
  { label: "Facturen", route: "invoices", icon: "document-text-outline" },
  { label: "Emails", route: "emails", icon: "mail-outline" },
  { label: "Contacten", route: "contacts", icon: "people-outline" },
  { label: "Belasting", route: "taxes", icon: "calculator-outline" },
  { label: "Notificaties", route: "notifications", icon: "notifications-outline" },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

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
        onPress={() => props.navigation.navigate("profile")}
      />

      {MENU_ITEMS.map((item) => (
        <DrawerItem
          key={item.route}
          label={item.label}
          icon={({ size }) => (
            <Ionicons name={item.icon} size={size} color={colors.text} />
          )}
          labelStyle={{ color: colors.text }}
          onPress={() => props.navigation.navigate(item.route)}
        />
      ))}

      <DrawerItem
        label="Uitloggen"
        icon={({ size }) => (
          <Ionicons name="log-out-outline" size={size} color={colors.danger} />
        )}
        labelStyle={{ color: colors.danger }}
        // Phase 1 wires this to real auth/logout. Intentionally a no-op
        // placeholder until then.
        onPress={() => {}}
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
