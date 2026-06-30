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
import contactsService from "@/api/services/contactsService";
import { Contact } from "@/api/types/contacts";
import { Card } from "@/components/Card";
import { Fab } from "@/components/Fab";
import { Colors, Spacing } from "@/constants/theme";
import { useContactsList } from "@/hooks/useContacts";

const LIMIT = 10;

function filterContacts(contacts: Contact[], search: string): Contact[] {
  if (search.trim() === "") {
    return contacts;
  }

  const lowercaseSearch = search.toLowerCase();
  return contacts.filter(
    (contact) =>
      contact.firstName.toLowerCase().includes(lowercaseSearch) ||
      contact.lastName.toLowerCase().includes(lowercaseSearch) ||
      contact.companyName.toLowerCase().includes(lowercaseSearch) ||
      contact.emailAddress.toLowerCase().includes(lowercaseSearch),
  );
}

export default function Contacts() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const { data, isLoading, isError, error } = useContactsList({ offset: 0 });

  useEffect(() => {
    if (data?.data.docs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing locally-accumulated pagination state from the query result; loadMore appends pages the query cache itself doesn't track, so this can't be computed inline.
      setAllContacts(data.data.docs);
      setHasNextPage(data.data.hasNextPage);
      setPage(0);
    }
  }, [data]);

  const filteredContacts = filterContacts(allContacts, searchText);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.contacts.base });
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
      const response = await contactsService.getContacts({ offset });

      setHasNextPage(response.data.hasNextPage);
      if (response.data.docs.length > 0) {
        setAllContacts((current) => [...current, ...response.data.docs]);
        setPage(nextPage);
      }
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable onPress={() => router.push(`/contacts/${item._id}`)}>
      <Card testID="contact-card" bordered style={styles.card}>
        <Text style={[styles.name, { color: colors.text }]}>
          {item.firstName} {item.lastName}
        </Text>
        {item.companyName ? (
          <Text style={{ color: colors.textSecondary }}>{item.companyName}</Text>
        ) : null}
        {item.emailAddress ? (
          <Text style={{ color: colors.textSecondary }}>{item.emailAddress}</Text>
        ) : null}
        {item.phoneNumber ? (
          <Text style={{ color: colors.textSecondary }}>{item.phoneNumber}</Text>
        ) : null}
      </Card>
    </Pressable>
  );

  return (
    <View
      testID="contacts-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TextInput
        testID="contacts-search"
        style={[
          styles.search,
          { backgroundColor: colors.backgroundElement, color: colors.text },
        ]}
        placeholder="Zoek contact..."
        placeholderTextColor={colors.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
      />

      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van contacten: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : filteredContacts.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Geen contacten gevonden
        </Text>
      ) : (
        <FlatList
          testID="contacts-list"
          data={filteredContacts}
          keyExtractor={(item) => item._id}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      <Fab
        testID="contacts-fab"
        accessibilityLabel="Nieuw contact toevoegen"
        onPress={() => router.push("/contacts/edit/create")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  search: {
    borderRadius: 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  message: {
    textAlign: "center",
    marginTop: Spacing.four,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  card: {
    gap: Spacing.half,
  },
  name: {
    fontWeight: "600",
    marginBottom: Spacing.one,
  },
});
