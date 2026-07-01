import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import QueryKeys from "@/api/queryKeys";
import emailsService from "@/api/services/emailsService";
import type { Email } from "@/api/types/emails";
import { Card } from "@/components/Card";
import { Fab } from "@/components/Fab";
import { Colors, Spacing } from "@/constants/theme";
import { useEmailsList } from "@/hooks/useEmails";

const LIMIT = 10;

function filterEmails(emails: Email[], search: string): Email[] {
  if (search.trim() === "") {
    return emails;
  }
  const q = search.toLowerCase();
  return emails.filter(
    (email) =>
      email.subject?.toLowerCase().includes(q) ||
      email.contactName?.toLowerCase().includes(q) ||
      email.contactEmail?.toLowerCase().includes(q) ||
      email.emailNumber?.toString().includes(q),
  );
}

export default function Emails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const { data, isLoading, isError, error } = useEmailsList({ offset: 0, limit: LIMIT });

  useEffect(() => {
    if (data?.data.docs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing locally-accumulated pagination state from the query result; loadMore appends pages the query cache itself doesn't track.
      setAllEmails(data.data.docs);
      setHasNextPage(data.data.hasNextPage);
      setPage(0);
    }
  }, [data]);

  const filteredEmails = filterEmails(allEmails, searchText);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    setIsRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasNextPage || isLoadingMoreRef.current) {
      return;
    }
    isLoadingMoreRef.current = true;
    try {
      const nextPage = page + 1;
      const offset = nextPage * LIMIT;
      const response = await emailsService.getEmails({ offset, limit: LIMIT });
      setHasNextPage(response.data.hasNextPage);
      if (response.data.docs.length > 0) {
        setAllEmails((current) => [...current, ...response.data.docs]);
        setPage(nextPage);
      }
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  const renderEmail = ({ item }: { item: Email }) => (
    <Pressable onPress={() => router.push(`/emails/${item._id}`)}>
      <Card testID="email-card" bordered style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>
          #{item.emailNumber} - {item.subject}
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Ontvanger</Text>
          <Text style={{ color: colors.text }}>{item.contactName || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Email</Text>
          <Text style={{ color: colors.text }}>{item.contactEmail || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Datum</Text>
          <Text style={{ color: colors.text }}>
            {new Date(item.emailDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            testID={`email-badge-${item._id}`}
            style={[
              styles.badge,
              { backgroundColor: item.send ? colors.success : colors.warning },
            ]}
          >
            {item.send ? "Verzonden" : "Concept"}
          </Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View
      testID="emails-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TextInput
        testID="emails-search"
        style={[styles.search, { backgroundColor: colors.backgroundElement, color: colors.text }]}
        placeholder="Zoek emails..."
        placeholderTextColor={colors.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
      />

      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van emails: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : filteredEmails.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Geen emails gevonden
        </Text>
      ) : (
        <FlatList
          testID="emails-list"
          data={filteredEmails}
          keyExtractor={(item) => item._id}
          renderItem={renderEmail}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      <Fab
        testID="emails-fab"
        accessibilityLabel="Nieuwe email toevoegen"
        onPress={() => router.push("/emails/edit/create")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  search: { borderRadius: 8, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  message: { textAlign: "center", marginTop: Spacing.four },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  card: { gap: Spacing.half },
  title: { fontWeight: "600", marginBottom: Spacing.one },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
});
