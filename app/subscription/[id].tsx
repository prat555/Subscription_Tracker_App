import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CATEGORIES, getCategoryConfig } from "../../constants/Colors";
import { useTheme } from "../../context/ThemeContext";
import { Subscription, formatCurrency, formatDate, subscriptionApi } from "../../services/api";

const BILLING_CYCLES = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export default function SubscriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [nextBillingDate, setNextBillingDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    if (id) loadSub();
  }, [id]);

  const loadSub = async () => {
    try {
      const data = await subscriptionApi.getById(id!);
      setSub(data);
      populateForm(data);
    } catch {
      Alert.alert("Error", "Subscription not found.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: Subscription) => {
    setName(data.name);
    setAmount(data.amount.toString());
    setBillingCycle(data.billing_cycle);
    setNextBillingDate(data.next_billing_date.split("T")[0]);
    setSelectedCategory(getCategoryConfig(data.category) as any);
    setReminderEnabled(data.reminder_enabled);
  };

  const handleSave = async () => {
    if (!name.trim() || !amount) {
      Alert.alert("Validation", "Name and amount are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await subscriptionApi.update(id!, {
        name: name.trim(),
        amount: parseFloat(amount),
        billing_cycle: billingCycle,
        next_billing_date: nextBillingDate,
        category: selectedCategory.name,
        color: selectedCategory.color,
        icon: selectedCategory.icon,
        reminder_enabled: reminderEnabled,
      });
      setSub(updated);
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Subscription", `Remove "${sub?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await subscriptionApi.delete(id!);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete subscription.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sub) return null;

  const cat = getCategoryConfig(sub.category);
  const iconColor = sub.color || cat.color;
  const inputStyle = [styles.input, { backgroundColor: colors.surface_secondary, borderColor: colors.border, color: colors.text_primary }];
  const labelStyle = [styles.label, { color: colors.text_secondary }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text_primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text_primary }]}>
            {editing ? "Edit Subscription" : "Details"}
          </Text>
          {editing ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: saving ? colors.border : colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.actionBtnText}>{saving ? "…" : "Save"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface_secondary }]}
              onPress={() => setEditing(true)}
            >
              <Feather name="edit-2" size={15} color={colors.text_primary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!editing ? (
            <>
              {/* Hero */}
              <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.heroIcon, { backgroundColor: iconColor + "20" }]}>
                  <Feather name={(sub.icon || cat.icon) as any} size={32} color={iconColor} />
                </View>
                <Text style={[styles.heroName, { color: colors.text_primary }]}>{sub.name}</Text>
                <Text style={[styles.heroAmount, { color: colors.text_primary }]}>
                  {formatCurrency(sub.amount, sub.billing_cycle)}
                </Text>
                <View style={[styles.heroBadge, { backgroundColor: iconColor + "20" }]}>
                  <Text style={[styles.heroBadgeText, { color: iconColor }]}>
                    {sub.category}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {[
                  { icon: "refresh-cw" as const, label: "Billing Cycle", value: sub.billing_cycle === "monthly" ? "Monthly" : "Yearly" },
                  { icon: "calendar" as const, label: "Next Billing", value: formatDate(sub.next_billing_date) },
                  { icon: "bell" as const, label: "Reminder", value: sub.reminder_enabled ? "On" : "Off" },
                  { icon: "clock" as const, label: "Added", value: formatDate(sub.created_at) },
                ].map((item, i) => (
                  <View key={i} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.primary + "15" }]}>
                      <Feather name={item.icon} size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.detailLabel, { color: colors.text_secondary }]}>{item.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.text_primary }]}>{item.value}</Text>
                  </View>
                ))}
              </View>

              {/* Yearly equivalent */}
              <View style={[styles.calcCard, { backgroundColor: colors.primary_light, borderColor: colors.border }]}>
                <Text style={[styles.calcLabel, { color: colors.primary }]}>Yearly Cost</Text>
                <Text style={[styles.calcValue, { color: colors.text_primary }]}>
                  {formatCurrency(
                    sub.billing_cycle === "yearly" ? sub.amount : sub.amount * 12
                  )}
                </Text>
                <Text style={[styles.calcSub, { color: colors.text_secondary }]}>
                  ~₹{Math.round(
                    sub.billing_cycle === "yearly" ? sub.amount / 365 : sub.amount / 30
                  )}/day
                </Text>
              </View>

              {/* Delete */}
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.danger }]}
                onPress={handleDelete}
              >
                <Feather name="trash-2" size={16} color={colors.danger} />
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
                  Delete Subscription
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={labelStyle}>Name</Text>
              <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Subscription name" placeholderTextColor={colors.text_secondary} />

              <Text style={labelStyle}>Amount (₹)</Text>
              <TextInput style={inputStyle} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Amount" placeholderTextColor={colors.text_secondary} />

              <Text style={labelStyle}>Billing Cycle</Text>
              <View style={styles.cycleRow}>
                {BILLING_CYCLES.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.cycleBtn, { backgroundColor: billingCycle === c.value ? colors.primary : colors.surface, borderColor: billingCycle === c.value ? colors.primary : colors.border }]}
                    onPress={() => setBillingCycle(c.value)}
                  >
                    <Text style={[styles.cycleBtnText, { color: billingCycle === c.value ? "#fff" : colors.text_primary }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={labelStyle}>Next Billing Date</Text>
              <TextInput style={inputStyle} value={nextBillingDate} onChangeText={setNextBillingDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.text_secondary} keyboardType="numeric" />

              <Text style={labelStyle}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map((c) => {
                  const sel = selectedCategory.name === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      style={[styles.catChip, { backgroundColor: sel ? c.color + "20" : colors.surface, borderColor: sel ? c.color : colors.border }]}
                      onPress={() => setSelectedCategory(c)}
                    >
                      <Feather name={c.icon as any} size={13} color={sel ? c.color : colors.text_secondary} />
                      <Text style={[styles.catChipText, { color: sel ? c.color : colors.text_secondary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { populateForm(sub); setEditing(false); }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text_secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scroll: { padding: 20, gap: 12, paddingBottom: 60 },
  heroCard: {
    alignItems: "center", padding: 28,
    borderRadius: 20, borderWidth: 1, gap: 8,
  },
  heroIcon: { width: 70, height: 70, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroName: { fontSize: 22, fontWeight: "800" },
  heroAmount: { fontSize: 28, fontWeight: "900" },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { fontSize: 12, fontWeight: "600" },
  detailCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  detailRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  detailIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  detailLabel: { flex: 1, fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600" },
  calcCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 4 },
  calcLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  calcValue: { fontSize: 28, fontWeight: "900" },
  calcSub: { fontSize: 13 },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8,
  },
  deleteBtnText: { fontSize: 15, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4 },
  cycleRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  cycleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cycleBtnText: { fontSize: 14, fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  catChipText: { fontSize: 11, fontWeight: "600" },
  cancelBtn: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: "center", marginTop: 8 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
});
