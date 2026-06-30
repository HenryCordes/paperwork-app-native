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
import invoicesService from "@/api/services/invoicesService";
import { Invoice } from "@/api/types/invoices";
import { Card } from "@/components/Card";
import { Fab } from "@/components/Fab";
import { Colors, Spacing } from "@/constants/theme";
import { useInvoicesList } from "@/hooks/useInvoices";
import { formatCurrency } from "@/utils/currency";
import { getInvoiceBadgeColor } from "@/utils/invoiceHelpers";

const LIMIT = 10;

function filterInvoices(invoices: Invoice[], search: string): Invoice[] {
  if (search.trim() === "") {
    return invoices;
  }

  const lowercaseSearch = search.toLowerCase();
  return invoices.filter(
    (invoice) =>
      invoice.contactName?.toLowerCase().includes(lowercaseSearch) ||
      invoice.invoiceNumber?.toString().includes(lowercaseSearch) ||
      invoice.invoiceDate?.toString().includes(lowercaseSearch) ||
      invoice.state?.toLowerCase().includes(lowercaseSearch),
  );
}

export default function Invoices() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const colorScheme = scheme === "dark" ? "dark" : "light";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const { data, isLoading, isError, error } = useInvoicesList({
    offset: 0,
    limit: LIMIT,
  });

  useEffect(() => {
    if (data?.data.docs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing locally-accumulated pagination state (allInvoices/hasNextPage/page) from the query result; loadMore appends pages the query cache itself doesn't track, so this can't be computed inline.
      setAllInvoices(data.data.docs);
      setHasNextPage(data.data.hasNextPage);
      setPage(0);
    }
  }, [data]);

  const filteredInvoices = filterInvoices(allInvoices, searchText);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.invoices.base });
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
      const response = await invoicesService.getInvoices({
        offset,
        limit: LIMIT,
      });

      setHasNextPage(response.data.hasNextPage);
      if (response.data.docs.length > 0) {
        setAllInvoices((current) => [...current, ...response.data.docs]);
        setPage(nextPage);
      }
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <Pressable onPress={() => router.push(`/invoices/${item._id}`)}>
      <Card testID="invoice-card" bordered style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>
          #{item.invoiceNumber} - {item.contactName}
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Datum</Text>
          <Text style={{ color: colors.text }}>
            {new Date(item.invoiceDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Totaal</Text>
          <Text style={{ color: colors.text }}>
            €{formatCurrency(item.priceIncludingTax || 0)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            testID={`invoice-badge-${item._id}`}
            style={[
              styles.badge,
              { backgroundColor: getInvoiceBadgeColor(item.state, colorScheme) },
            ]}
          >
            {item.state || "Onbekend"}
          </Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View
      testID="invoices-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TextInput
        testID="invoices-search"
        style={[
          styles.search,
          { backgroundColor: colors.backgroundElement, color: colors.text },
        ]}
        placeholder="Zoek facturen..."
        placeholderTextColor={colors.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
      />

      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van facturen: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : filteredInvoices.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Geen facturen gevonden
        </Text>
      ) : (
        <FlatList
          testID="invoices-list"
          data={filteredInvoices}
          keyExtractor={(item) => item._id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      <Fab
        testID="invoices-fab"
        accessibilityLabel="Nieuwe factuur toevoegen"
        onPress={() => router.push("/invoices/edit/create")}
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
  title: {
    fontWeight: "600",
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
