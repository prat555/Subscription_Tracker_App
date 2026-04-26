import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCategoryConfig } from "../../constants/Colors";
import { useTheme } from "../../context/ThemeContext";
import {
  Analytics,
  formatCurrency,
  formatShortDate,
  Subscription,
  subscriptionApi,
} from "../../services/api";

const { width } = Dimensions.get("window");

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  const loadData = useCallback(async () => {
    try {
      const online = await subscriptionApi.checkHealth();
      setIsOffline(!online);
      const [s, a] = await Promise.all([
        subscriptionApi.getAll(),
        subscriptionApi.getAnalytics(),
      ]);
      setSubs(s);
      setAnalytics(a);
    } catch (e) {
      console.error("loadData error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Subscription", `Remove "${name}"?`, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => swipeRefs.current[id]?.close(),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await subscriptionApi.delete(id);
            setSubs((prev) => prev.filter((s) => s.id !== id));
            loadData();
          } catch {
            Alert.alert("Error", "Could not delete. Please try again.");
            swipeRefs.current[id]?.close();
          }
        },
      },
    ]);
  };

  const today = new Date();
  const dateLabel = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

  const renderRightActions = (sub: Subscription) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      onPress={() => handleDelete(sub.id, sub.name)}
    >
      <Feather name="trash-2" size={20} color="#fff" />
      <Text style={styles.deleteLabel}>Delete</Text>
    </TouchableOpacity>
  );

  const renderSubCard = (sub: Subscription, idx: number) => {
    const cat = getCategoryConfig(sub.category);
    const iconColor = sub.color || cat.color;
    return (
      <Animated.View key={sub.id} entering={FadeInDown.delay(idx * 60).springify()}>
        <Swipeable
          ref={(ref) => { swipeRefs.current[sub.id] = ref; }}
          renderRightActions={() => renderRightActions(sub)}
          rightThreshold={40}
          overshootRight={false}
        >
          <TouchableOpacity
            style={[styles.subCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/subscription/${sub.id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.subIconCircle, { backgroundColor: iconColor + "20" }]}>
              <Feather name={(sub.icon || cat.icon) as any} size={20} color={iconColor} />
            </View>
            <View style={styles.subInfo}>
              <Text style={[styles.subName, { color: colors.text_primary }]}>{sub.name}</Text>
              <Text style={[styles.subMeta, { color: colors.text_secondary }]}>
                {sub.category} · {formatShortDate(sub.next_billing_date)}
              </Text>
            </View>
            <View style={styles.subRight}>
              <Text style={[styles.subAmount, { color: colors.text_primary }]}>
                {formatCurrency(sub.amount)}
              </Text>
              <Text style={[styles.subCycle, { color: colors.text_secondary }]}>
                /{sub.billing_cycle === "monthly" ? "mo" : sub.billing_cycle === "yearly" ? "yr" : "mo"}
              </Text>
            </View>
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const maxCat = analytics?.category_breakdown
    ? Math.max(...Object.values(analytics.category_breakdown), 1)
    : 1;

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: Math.round(tabBarHeight / 2) + 8 }}
      >
        {/* Offline Banner */}
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.warning + "20" }]}>
            <Feather name="wifi-off" size={14} color={colors.warning} />
            <Text style={[styles.offlineText, { color: colors.warning }]}>
              Demo mode — connect backend to sync data
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerDate, { color: colors.text_secondary }]}>{dateLabel}</Text>
            <Text style={[styles.headerTitle, { color: colors.text_primary }]}>SubTrack</Text>
          </View>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: colors.surface_secondary }]}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Feather name="settings" size={20} color={colors.text_primary} />
          </TouchableOpacity>
        </View>

        {/* Spending Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary_light, borderColor: colors.border }]}>
          <Text style={[styles.heroLabel, { color: colors.primary }]}>Monthly Total</Text>
          <Text style={[styles.heroAmount, { color: colors.text_primary }]}>
            ₹{(analytics?.monthly_total ?? 0).toLocaleString("en-IN")}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: colors.text_secondary }]}>Yearly</Text>
              <Text style={[styles.heroStatValue, { color: colors.text_primary }]}>
                ₹{(analytics?.yearly_total ?? 0).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: colors.text_secondary }]}>Active</Text>
              <Text style={[styles.heroStatValue, { color: colors.text_primary }]}>
                {analytics?.subscription_count ?? 0} subs
              </Text>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: colors.text_secondary }]}>Per Day</Text>
              <Text style={[styles.heroStatValue, { color: colors.text_primary }]}>
                ₹{Math.round((analytics?.monthly_total ?? 0) / 30).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Upcoming Bills */}
        {analytics?.upcoming_bills && analytics.upcoming_bills.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>Due Soon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upcomingScroll}>
              {analytics.upcoming_bills.map((bill) => {
                const cat = getCategoryConfig(bill.category);
                const iconColor = bill.color || cat.color;
                return (
                  <TouchableOpacity
                    key={bill.id}
                    style={[styles.upcomingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push(`/subscription/${bill.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.upcomingIcon, { backgroundColor: iconColor + "20" }]}>
                      <Feather name={(bill.icon || cat.icon) as any} size={18} color={iconColor} />
                    </View>
                    <Text style={[styles.upcomingName, { color: colors.text_primary }]} numberOfLines={1}>
                      {bill.name}
                    </Text>
                    <Text style={[styles.upcomingAmount, { color: colors.text_primary }]}>
                      ₹{bill.amount.toLocaleString("en-IN")}
                    </Text>
                    <View style={[styles.upcomingBadge, {
                      backgroundColor: bill.days_until === 0 ? colors.danger + "20" : colors.warning + "20"
                    }]}>
                      <Text style={[styles.upcomingDue, {
                        color: bill.days_until === 0 ? colors.danger : colors.warning,
                      }]}>
                        {bill.days_until === 0 ? "Today" : `${bill.days_until}d`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Breakdown */}
        {analytics?.category_breakdown && Object.keys(analytics.category_breakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>By Category</Text>
            <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {Object.entries(analytics.category_breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const config = getCategoryConfig(cat);
                  const pct = (amount / maxCat) * 100;
                  return (
                    <View key={cat} style={styles.catRow}>
                      <View style={styles.catLabel}>
                        <View style={[styles.catDot, { backgroundColor: config.color }]} />
                        <Text style={[styles.catName, { color: colors.text_primary }]}>{cat}</Text>
                      </View>
                      <View style={styles.catBarContainer}>
                        <View style={[styles.catBarBg, { backgroundColor: colors.border }]}>
                          <View style={[styles.catBar, { width: `${pct}%`, backgroundColor: config.color }]} />
                        </View>
                        <Text style={[styles.catAmount, { color: colors.text_secondary }]}>
                          ₹{Math.round(amount).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* All Subscriptions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>
              All Subscriptions
            </Text>
            {subs.length > 0 && (
              <Text style={[styles.sectionCount, { color: colors.text_secondary }]}>
                {subs.length} total
              </Text>
            )}
          </View>
          {subs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="inbox" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text_primary }]}>No subscriptions yet</Text>
              <Text style={[styles.emptySubText, { color: colors.text_secondary }]}>
                Tap + to add your first one
              </Text>
            </View>
          ) : (
            <View style={styles.subList}>
              {subs.map((sub, idx) => renderSubCard(sub, idx))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/add-subscription")}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  offlineText: { fontSize: 12, fontWeight: "500" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerDate: { fontSize: 13, fontWeight: "500" },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: 20, borderRadius: 24, padding: 24,
    borderWidth: 1, marginBottom: 8,
  },
  heroLabel: {
    fontSize: 12, fontWeight: "600", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 4,
  },
  heroAmount: { fontSize: 40, fontWeight: "900", letterSpacing: -1.5, marginBottom: 16 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 11, fontWeight: "500", marginBottom: 2 },
  heroStatValue: { fontSize: 15, fontWeight: "700" },
  heroDivider: { width: 1, height: 32, opacity: 0.4 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionCount: { fontSize: 13, fontWeight: "500" },
  upcomingScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  upcomingCard: {
    width: 130, padding: 14, borderRadius: 16, marginRight: 12, borderWidth: 1,
  },
  upcomingIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  upcomingName: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  upcomingAmount: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  upcomingBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  upcomingDue: { fontSize: 11, fontWeight: "700" },
  categoryCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  catRow: { gap: 6 },
  catLabel: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 13, fontWeight: "500" },
  catBarContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBarBg: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  catBar: { height: "100%", borderRadius: 4 },
  catAmount: { fontSize: 12, fontWeight: "500", width: 72, textAlign: "right" },
  subList: { gap: 8 },
  subCard: {
    flexDirection: "row", alignItems: "center",
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  subIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  subInfo: { flex: 1 },
  subName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  subMeta: { fontSize: 12 },
  subRight: { alignItems: "flex-end" },
  subAmount: { fontSize: 15, fontWeight: "700" },
  subCycle: { fontSize: 11, marginTop: 1 },
  deleteAction: {
    width: 88, alignItems: "center", justifyContent: "center",
    borderRadius: 16, marginLeft: 8, gap: 4,
  },
  deleteLabel: { color: "#fff", fontSize: 11, fontWeight: "600" },
  emptyState: {
    alignItems: "center", padding: 48,
    borderRadius: 20, borderWidth: 1, gap: 8,
  },
  emptyIconBg: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: "700" },
  emptySubText: { fontSize: 13 },
  fab: {
    position: "absolute", bottom: 90, right: 20,
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
