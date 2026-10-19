import {
  ScrollView, Text, View, ActivityIndicator,
  TouchableOpacity, RefreshControl, StyleSheet, Pressable,
} from "react-native"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import { Users, AlertTriangle, ArrowLeftRight, Clock, ChevronRight, CalendarPlus } from "lucide-react-native"
import { api } from "../../api"
import { Colors, Shadow } from "../../constants/theme"

type DashboardData = {
  total_employees: number
  on_shift_now: number
  pending_time_off: number
  pending_swaps: number
  staffing_alerts: { department: string; shift: string; assigned: number; required: number }[]
  employees_per_team: { department: string; team: string; employees_on_shift: number }[]
}

type StatCardProps = { label: string; value: number; icon: React.ReactNode; accent: string; accentBg: string }

function StatCard({ label, value, icon, accent, accentBg }: StatCardProps) {
  return (
    <View style={[styles.statCard, Shadow.sm]}>
      <View style={[styles.statIcon, { backgroundColor: accentBg }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function AdminHomeScreen() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const getAdminDashboardData = async () => {
    try {
      const response = await api.get("api/admin/dashboard/")
      setData(response.data)
    } catch (error) {
      console.error("Failed to load admin dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { getAdminDashboardData() }, [])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const hasAlerts = (data?.staffing_alerts?.length ?? 0) > 0

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); getAdminDashboardData() }}
          />
        }
      >
        {/* Header */}
        <LinearGradient colors={["#1E1B4B", "#3730A3"]} style={styles.header}>
          <Text style={styles.headerLabel}>ADMIN DASHBOARD</Text>
          <Text style={styles.headerTitle}>Hospital Overview</Text>
          <Text style={styles.headerSub}>Today's staffing at a glance</Text>

          {/* Quick action */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/manage-shifts") }}
            style={({ pressed }) => [styles.manageBtn, pressed && { opacity: 0.85 }]}
          >
            <CalendarPlus size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.manageBtnText}>Manage Shifts & Rosters</Text>
            <ChevronRight size={16} color={Colors.primary} strokeWidth={2} />
          </Pressable>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Staff"
              value={data?.total_employees ?? 0}
              icon={<Users size={18} color={Colors.primary} strokeWidth={2} />}
              accent={Colors.primary}
              accentBg={Colors.primaryLight}
            />
            <StatCard
              label="On Shift Now"
              value={data?.on_shift_now ?? 0}
              icon={<Clock size={18} color={Colors.success} strokeWidth={2} />}
              accent={Colors.success}
              accentBg={Colors.successLight}
            />
            <StatCard
              label="Leave Pending"
              value={data?.pending_time_off ?? 0}
              icon={<AlertTriangle size={18} color={Colors.warning} strokeWidth={2} />}
              accent={Colors.warning}
              accentBg={Colors.warningLight}
            />
            <StatCard
              label="Swaps Pending"
              value={data?.pending_swaps ?? 0}
              icon={<ArrowLeftRight size={18} color={Colors.info} strokeWidth={2} />}
              accent={Colors.info}
              accentBg={Colors.infoLight}
            />
          </View>

          {/* Staffing Alerts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={14} color={hasAlerts ? Colors.error : Colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, hasAlerts && { color: Colors.error }]}>
                Staffing Alerts
              </Text>
              {hasAlerts && (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{data!.staffing_alerts.length}</Text>
                </View>
              )}
            </View>

            {!hasAlerts ? (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyTitle}>All fully staffed</Text>
                <Text style={styles.emptySubtitle}>No staffing issues today.</Text>
              </View>
            ) : (
              data!.staffing_alerts.map((alert, i) => {
                const pct = Math.round((alert.assigned / alert.required) * 100)
                const isLow = pct < 50
                return (
                  <View key={i} style={[styles.card, styles.alertCard]}>
                    <View style={[styles.alertStripe, { backgroundColor: isLow ? Colors.error : Colors.warning }]} />
                    <View style={styles.alertContent}>
                      <Text style={styles.alertDept}>{alert.department}</Text>
                      <Text style={styles.alertShift}>{alert.shift}</Text>
                    </View>
                    <View style={styles.alertRight}>
                      <Text style={[styles.alertCount, { color: isLow ? Colors.error : Colors.warning }]}>
                        {alert.assigned}/{alert.required}
                      </Text>
                      <Text style={styles.alertCountLabel}>staff</Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* Teams on shift */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Teams Currently on Shift</Text>
            </View>

            {!data?.employees_per_team?.length ? (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptySubtitle}>No employees currently on shift.</Text>
              </View>
            ) : (
              data.employees_per_team.map((team, i) => (
                <View key={i} style={[styles.card, styles.teamRow]}>
                  <View style={styles.teamDot}>
                    <Text style={styles.teamDotText}>{team.department[0]}</Text>
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamDept}>{team.department}</Text>
                    <Text style={styles.teamName}>{team.team}</Text>
                  </View>
                  <View style={styles.teamCount}>
                    <Text style={styles.teamCountNum}>{team.employees_on_shift}</Text>
                    <Text style={styles.teamCountLabel}>on shift</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 },
  headerLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 1.2, marginBottom: 6 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, marginBottom: 20 },
  manageBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
    ...Shadow.sm,
  },
  manageBtnText: { flex: 1, color: Colors.primary, fontWeight: "600", fontSize: 14 },
  content: { padding: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: {
    width: "47.5%", backgroundColor: Colors.card, borderRadius: 16,
    padding: 16, alignItems: "flex-start",
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: "500" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  alertBadge: { backgroundColor: Colors.errorLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  alertBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.error },
  card: { backgroundColor: Colors.card, borderRadius: 14, marginBottom: 8, overflow: "hidden", ...Shadow.sm },
  emptyCard: { padding: 24, alignItems: "center" },
  emptyEmoji: { fontSize: 28, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: Colors.text },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  alertCard: { flexDirection: "row", alignItems: "center" },
  alertStripe: { width: 4, alignSelf: "stretch" },
  alertContent: { flex: 1, padding: 14 },
  alertDept: { fontSize: 14, fontWeight: "600", color: Colors.text },
  alertShift: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  alertRight: { paddingRight: 16, alignItems: "center" },
  alertCount: { fontSize: 18, fontWeight: "700" },
  alertCountLabel: { fontSize: 11, color: Colors.textSecondary },
  teamRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  teamDot: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  teamDotText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  teamInfo: { flex: 1 },
  teamDept: { fontSize: 14, fontWeight: "600", color: Colors.text },
  teamName: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  teamCount: { alignItems: "center" },
  teamCountNum: { fontSize: 20, fontWeight: "700", color: Colors.text },
  teamCountLabel: { fontSize: 11, color: Colors.textSecondary },
})
