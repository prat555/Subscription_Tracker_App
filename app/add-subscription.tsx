import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { CATEGORIES } from "../constants/Colors";
import { useTheme } from "../context/ThemeContext";
import { subscriptionApi } from "../services/api";

const BILLING_CYCLES = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export default function AddSubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [nextBillingDate, setNextBillingDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return "Please enter a subscription name.";
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return "Please enter a valid amount.";
    if (!nextBillingDate.match(/^\d{4}-\d{2}-\d{2}$/))
      return "Date must be in YYYY-MM-DD format.";
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }
    setSaving(true);
    try {
      await subscriptionApi.create({
        name: name.trim(),
        amount: parseFloat(amount),
        billing_cycle: billingCycle,
        next_billing_date: nextBillingDate,
        category: selectedCategory.name,
        color: selectedCategory.color,
        icon: selectedCategory.icon,
        reminder_enabled: reminderEnabled,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save subscription. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text_primary }];
  const labelStyle = [styles.label, { color: colors.text_secondary }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.text_primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text_primary }]}>
            Add Subscription
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <Text style={labelStyle}>Name</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Netflix, Spotify"
            placeholderTextColor={colors.text_secondary}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          {/* Amount */}
          <Text style={labelStyle}>Amount (₹)</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. 649"
            placeholderTextColor={colors.text_secondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            returnKeyType="next"
          />

          {/* Billing Cycle */}
          <Text style={labelStyle}>Billing Cycle</Text>
          <View style={styles.cycleRow}>
            {BILLING_CYCLES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.cycleBtn,
                  {
                    backgroundColor:
                      billingCycle === c.value ? colors.primary : colors.surface,
                    borderColor:
                      billingCycle === c.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setBillingCycle(c.value)}
              >
                <Text
                  style={[
                    styles.cycleBtnText,
                    {
                      color:
                        billingCycle === c.value ? "#fff" : colors.text_primary,
                    },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Next Billing Date */}
          <Text style={labelStyle}>Next Billing Date</Text>
          <TextInput
            style={inputStyle}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text_secondary}
            value={nextBillingDate}
            onChangeText={setNextBillingDate}
            keyboardType="numeric"
          />

          {/* Category */}
          <Text style={labelStyle}>Category</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategory.name === cat.name;
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: selected ? cat.color + "20" : colors.surface,
                      borderColor: selected ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Feather
                    name={cat.icon as any}
                    size={14}
                    color={selected ? cat.color : colors.text_secondary}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      { color: selected ? cat.color : colors.text_secondary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reminder */}
          <View style={[styles.reminderRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reminderLeft}>
              <Feather name="bell" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.reminderTitle, { color: colors.text_primary }]}>
                  Billing Reminder
                </Text>
                <Text style={[styles.reminderSub, { color: colors.text_secondary }]}>
                  Notify before due date
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setReminderEnabled((v) => !v)}
              style={[
                styles.toggle,
                { backgroundColor: reminderEnabled ? colors.primary : colors.border },
              ]}
            >
              <View style={[styles.toggleThumb, { transform: [{ translateX: reminderEnabled ? 20 : 2 }] }]} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  form: { padding: 20, gap: 8, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 4,
  },
  cycleRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  cycleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, alignItems: "center",
  },
  cycleBtnText: { fontSize: 14, fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  catChipText: { fontSize: 12, fontWeight: "600" },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  reminderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  reminderTitle: { fontSize: 14, fontWeight: "600" },
  reminderSub: { fontSize: 12 },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
