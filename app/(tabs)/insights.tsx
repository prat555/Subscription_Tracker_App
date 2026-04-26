import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { AIInsight, Analytics, subscriptionApi } from "../../services/api";

const INSIGHT_STYLES: Record<
  string,
  { bg: string; border: string; icon: string }
> = {};

export default function InsightsScreen() {
  const { colors } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [insightRes, analyticsRes] = await Promise.all([
        subscriptionApi.getAiInsights(),
        subscriptionApi.getAnalytics(),
      ]);
      setInsights(insightRes.insights);
      setAnalytics(analyticsRes);
    } catch (e) {
      console.error(e);
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

  const getInsightColor = (type: string) => {
    switch (type) {
      case "warning":
        return colors.danger;
      case "tip":
        return colors.primary;
      case "saving":
        return colors.success;
      default:
        return colors.text_secondary;
    }
  };

  const getInsightBg = (type: string) => {
    return getInsightColor(type) + "15";
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const monthlyPerDay = Math.round((analytics?.monthly_total ?? 0) / 30);
  const biggestCategory =
    analytics?.category_breakdown
      ? Object.entries(analytics.category_breakdown).sort(([, a], [, b]) => b - a)[0]
      : null;

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: Math.round(tabBarHeight / 2) + 8 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text_primary }]}>
            Insights
          </Text>
          <Text style={[styles.headerSub, { color: colors.text_secondary }]}>
            Your subscription health
          </Text>
        </View>

        {/* Quick stats */}
        {analytics && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="calendar" size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text_primary }]}>
                ₹{monthlyPerDay}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text_secondary }]}>per day</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="layers" size={18} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.text_primary }]}>
                {analytics.subscription_count}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text_secondary }]}>active</Text>
            </View>
            {biggestCategory && (
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="pie-chart" size={18} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.text_primary }]} numberOfLines={1}>
                  {biggestCategory[0]}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text_secondary }]}>top spend</Text>
              </View>
            )}
          </View>
        )}

        {/* Insights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>
            Smart Insights
          </Text>
          {insights.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="bar-chart-2" size={32} color={colors.text_secondary} />
              <Text style={[styles.emptyText, { color: colors.text_secondary }]}>
                Add subscriptions to get insights
              </Text>
            </View>
          ) : (
            <View style={styles.insightList}>
              {insights.map((insight, i) => {
                const accentColor = getInsightColor(insight.type);
                return (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(i * 80).springify()}
                    style={[
                      styles.insightCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderLeftColor: accentColor,
                      },
                    ]}
                  >
                    <View style={[styles.insightIconBg, { backgroundColor: getInsightBg(insight.type) }]}>
                      <Feather
                        name={(insight.icon || "info") as any}
                        size={18}
                        color={accentColor}
                      />
                    </View>
                    <View style={styles.insightContent}>
                      <Text style={[styles.insightTitle, { color: colors.text_primary }]}>
                        {insight.title}
                      </Text>
                      <Text style={[styles.insightMessage, { color: colors.text_secondary }]}>
                        {insight.message}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>

        {/* Annual projection */}
        {analytics && analytics.subscription_count > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>
              Annual Projection
            </Text>
            <View style={[styles.projectionCard, { backgroundColor: colors.primary_light, borderColor: colors.border }]}>
              <View style={styles.projRow}>
                <Text style={[styles.projLabel, { color: colors.primary }]}>This Year</Text>
                <Text style={[styles.projValue, { color: colors.text_primary }]}>
                  ₹{(analytics.yearly_total).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={[styles.projDivider, { backgroundColor: colors.border }]} />
              <View style={styles.projRow}>
                <Text style={[styles.projLabel, { color: colors.text_secondary }]}>Daily Cost</Text>
                <Text style={[styles.projValue, { color: colors.text_primary }]}>
                  ₹{monthlyPerDay}/day
                </Text>
              </View>
              <View style={[styles.projDivider, { backgroundColor: colors.border }]} />
              <View style={styles.projRow}>
                <Text style={[styles.projLabel, { color: colors.text_secondary }]}>Per Subscription</Text>
                <Text style={[styles.projValue, { color: colors.text_primary }]}>
                  ₹{Math.round(analytics.monthly_total / Math.max(analytics.subscription_count, 1))}/mo avg
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  insightList: { gap: 10 },
  insightCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 12,
    alignItems: "flex-start",
  },
  insightIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  insightMessage: { fontSize: 13, lineHeight: 19 },
  emptyCard: {
    alignItems: "center",
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  projectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  projRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  projLabel: { fontSize: 13, fontWeight: "500" },
  projValue: { fontSize: 15, fontWeight: "700" },
  projDivider: { height: 1, opacity: 0.4 },
});
