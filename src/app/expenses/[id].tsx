import { useLayoutEffect } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useExpenseById, useDeleteExpense } from "@/hooks/useExpenses";
import documentsService from "@/api/services/documentsService";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";
import { formatCurrency } from "@/utils/currency";

export default function ExpenseDetails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, error } = useExpenseById(id);
  const expense = data?.data;
  const deleteMutation = useDeleteExpense();

  const handleDeletePress = () => {
    Alert.alert(
      "Kosten verwijderen",
      "Weet je zeker dat je deze kosten wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(id, { onSuccess: () => router.back() });
          },
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Kosten details",
      headerRight: () =>
        expense ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Bewerken"
              // Cast needed until Task 7 adds src/app/expenses/edit/[id].tsx.
              onPress={() => router.push(`/expenses/edit/${id}` as Href)}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable accessibilityLabel="Verwijderen" onPress={handleDeletePress}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleDeletePress is recreated each render but its identity isn't a meaningful dependency here
  }, [navigation, expense, colors.primary, colors.danger, id]);

  return (
    <View testID="expense-details-screen" style={[styles.container, { backgroundColor: colors.background }]}>
      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van kosten details: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : expense ? (
        <>
          <Card style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>
              #{expense.expenseNumber} - {expense.info || "Bon"}
            </Text>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Contact</Text>
              <Text style={{ color: colors.text }}>{expense.contactName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Datum</Text>
              <Text style={{ color: colors.text }}>
                {new Date(expense.expenseDate).toLocaleDateString("nl-NL")}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>BTW 21%</Text>
              <Text style={{ color: colors.text }}>€{formatCurrency(expense.tax || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>BTW 9%</Text>
              <Text style={{ color: colors.text }}>€{formatCurrency(expense.taxLow || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Totaal</Text>
              <Text style={[styles.totalLabel, { color: colors.text }]}>
                €{formatCurrency(expense.price)}
              </Text>
            </View>
          </Card>

          {expense.expenseFile ? (
            <Pressable
              onPress={() => Linking.openURL(documentsService.getDocumentUrl(expense.expenseFile!))}
            >
              <Card style={styles.card}>
                <Text style={{ color: colors.primary }}>Bon bekijken</Text>
              </Card>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  message: {
    textAlign: "center",
    marginTop: Spacing.four,
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
  totalLabel: {
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.three,
  },
});
