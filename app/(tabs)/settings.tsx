import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const VERSION = "1.0.0";

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

  type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    toggle,
    toggleValue,
    onToggle,
    danger,
    chevron = true,
  }: {
    icon: FeatherIconName;
    label: string;
    value?: string;
    onPress?: () => void;
    toggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (v: boolean) => void;
    danger?: boolean;
    chevron?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={toggle || !onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.rowIcon, { backgroundColor: (danger ? colors.danger : colors.primary) + "18" }]}>
        <Feather name={icon} size={16} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text_primary }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value && (
          <Text style={[styles.rowValue, { color: colors.text_secondary }]}>{value}</Text>
        )}
        {toggle && onToggle && (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        )}
        {!toggle && chevron && onPress && (
          <Feather name="chevron-right" size={16} color={colors.text_secondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text_secondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: Math.round(tabBarHeight / 2) + 8 }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text_primary }]}>Settings</Text>
        </View>

        <Section title="APPEARANCE">
          <SettingRow
            icon="moon"
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={toggleTheme}
            chevron={false}
          />
        </Section>

        <Section title="ABOUT">
          <SettingRow
            icon="info"
            label="Version"
            value={VERSION}
            chevron={false}
          />
          <SettingRow
            icon="star"
            label="Rate App"
            onPress={() =>
              Alert.alert("Rate SubTrack", "Thanks for using SubTrack! Rating helps us grow.")
            }
          />
          <SettingRow
            icon="mail"
            label="Send Feedback"
            onPress={() => Linking.openURL("mailto:feedback@subtrack.app")}
          />
          <SettingRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => Alert.alert("Privacy Policy", "We do not share your data with third parties.")}
          />
        </Section>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text_secondary }]}>
            SubTrack v{VERSION}
          </Text>
          <Text style={[styles.footerSub, { color: colors.text_secondary }]}>
            Track your subscriptions with ease
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 13 },
  footer: { alignItems: "center", paddingVertical: 32, gap: 4 },
  footerText: { fontSize: 13, fontWeight: "500" },
  footerSub: { fontSize: 12 },
});
