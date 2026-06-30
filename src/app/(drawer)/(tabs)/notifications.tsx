import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import QueryKeys from "@/api/queryKeys";
import { StoredNotification } from "@/api/types/notifications";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";
import {
  useNotificationsList,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Nu";
  if (diffMins < 60) return `${diffMins}m geleden`;
  if (diffHours < 24) return `${diffHours}u geleden`;
  if (diffDays < 7) return `${diffDays}d geleden`;

  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const queryClient = useQueryClient();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, isError, error } = useNotificationsList();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.data ?? [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    setIsRefreshing(false);
  };

  const handleMarkAsRead = (notification: StoredNotification) => {
    markAsRead.mutate({ notificationId: notification._id, read: true });
  };

  const handleDelete = (notification: StoredNotification) => {
    deleteNotification.mutate(notification._id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const renderNotification = ({ item }: { item: StoredNotification }) => (
    <Card testID={`notification-card-${item._id}`} bordered style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {!item.read && (
            <View
              testID="notification-unread-indicator"
              style={[styles.unreadDot, { backgroundColor: colors.primary }]}
            />
          )}
          <Text
            style={[
              styles.title,
              { color: colors.text },
              !item.read && styles.titleUnread,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.body}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          testID={`notification-mark-read-${item._id}`}
          onPress={() => handleMarkAsRead(item)}
          style={[styles.actionButton, { backgroundColor: colors.backgroundElement }]}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {item.read ? "Ongelezen" : "Gelezen"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`notification-delete-${item._id}`}
          onPress={() => handleDelete(item)}
          style={[styles.actionButton, { backgroundColor: colors.backgroundElement }]}
        >
          <Text style={[styles.actionText, { color: colors.danger }]}>Verwijderen</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Notificaties</Text>
        <Pressable
          testID="notifications-mark-all-read"
          onPress={handleMarkAllAsRead}
          style={styles.markAllButton}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            Alles gelezen
          </Text>
        </Pressable>
      </View>

      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van notificaties: {error?.message ?? "Onbekende fout"}
        </Text>
      ) : isLoading ? null : notifications.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Geen notificaties
        </Text>
      ) : (
        <FlatList
          testID="notifications-list"
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  markAllButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  message: {
    textAlign: "center",
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  listContent: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  card: {
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  titleUnread: {
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
    flexShrink: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
