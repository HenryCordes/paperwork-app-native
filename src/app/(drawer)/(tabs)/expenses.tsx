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
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useExpensesList } from "@/hooks/useExpenses";
import expensesService from "@/api/services/expensesService";
import QueryKeys from "@/api/queryKeys";
import { Expense } from "@/api/types/expenses";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";
import { formatCurrency } from "@/utils/currency";

const LIMIT = 10;

function filterExpenses(expenses: Expense[], search: string): Expense[] {
  if (search.trim() === "") {
    return expenses;
  }

  const lowercaseSearch = search.toLowerCase();
  return expenses.filter(
    (expense) =>
      expense.info?.toLowerCase().includes(lowercaseSearch) ||
      expense.contactName?.toLowerCase().includes(lowercaseSearch) ||
      expense.expenseNumber?.toString().includes(lowercaseSearch) ||
      expense.price?.toString().includes(lowercaseSearch),
  );
}

export default function Expenses() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const { data, isLoading, isError, error } = useExpensesList({ offset: 0, limit: LIMIT });

  useEffect(() => {
    if (data?.data.docs) {
      setAllExpenses(data.data.docs);
      setHasNextPage(data.data.hasNextPage);
      setPage(0);
    }
  }, [data]);

  const filteredExpenses = filterExpenses(allExpenses, searchText);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.base });
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
      const response = await expensesService.getExpenses({ offset, limit: LIMIT });

      setHasNextPage(response.data.hasNextPage);
      if (response.data.docs.length > 0) {
        setAllExpenses((current) => [...current, ...response.data.docs]);
        setPage(nextPage);
      }
    } finally {
      isLoadingMoreRef.current = false;
    }
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <Pressable onPress={() => router.push(`/expenses/${item._id}`)}>
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>
          #{item.expenseNumber} - {item.info}
        </Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Contact</Text>
          <Text style={{ color: colors.text }}>{item.contactName || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Datum</Text>
          <Text style={{ color: colors.text }}>
            {new Date(item.expenseDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Bedrag</Text>
          <Text style={{ color: colors.text }}>€{formatCurrency(item.price || 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>BTW 21%</Text>
          <Text style={{ color: colors.text }}>€{formatCurrency(item.tax || 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>BTW 9%</Text>
          <Text style={{ color: colors.text }}>€{formatCurrency(item.taxLow || 0)}</Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View
      testID="expenses-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TextInput
        testID="expenses-search"
        style={[
          styles.search,
          { backgroundColor: colors.backgroundElement, color: colors.text },
        ]}
        placeholder="Zoek kosten..."
        placeholderTextColor={colors.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
      />

      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van kosten: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : filteredExpenses.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Geen kosten gevonden
        </Text>
      ) : (
        <FlatList
          testID="expenses-list"
          data={filteredExpenses}
          keyExtractor={(item) => item._id}
          renderItem={renderExpense}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      <Pressable
        testID="expenses-fab"
        accessibilityLabel="Nieuwe kosten toevoegen"
        style={styles.fabPosition}
        onPress={() => router.push("/expenses/edit/create")}
      >
        <Card style={[styles.fab, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </Card>
      </Pressable>
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
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  card: {
    gap: Spacing.one,
  },
  title: {
    fontWeight: "600",
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fabPosition: {
    position: "absolute",
    right: Spacing.four,
    bottom: Spacing.four,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
