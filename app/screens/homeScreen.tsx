import {
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Pressable,
} from "react-native"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { useEffect, useState } from "react"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import { Calendar, Clock, ChevronRight, Users, Sun, Moon, Sunset } from "lucide-react-native"
import { api } from "../../api"
import { Colors, Shadow, ShiftColors } from "../../constants/theme"

dayjs.extend(isoWeek)
dayjs.extend(utc)
dayjs.extend(timezone)

type EmployeeType = { name: string; role: string; department: string; team: string; hospital: string; timezone: string }
type WeeklySummaryType = { hours_worked: number; hours_scheduled: number }
type ShiftType = { category: string; start?: string; end?: string }
type WeeklyShiftType = { date: string; day: string; category: string; start?: string; end?: string }
type FullRecordType = {
  employee: EmployeeType
  weekly_summary: WeeklySummaryType
  next_shift: (ShiftType & { id?: number; assigned: number; required: number | null }) | null
  weekly_shifts: WeeklyShiftType[]
}

function ShiftTypeIcon({ category, size = 16 }: { category: string; size?: number }) {
  const lower = category?.toLowerCase() ?? ""
  if (lower.includes("night")) return <Moon size={size} color="#3730A3" strokeWidth={2} />
  if (lower.includes("late")) return <Sunset size={size} color="#0F766E" strokeWidth={2} />
  return <Sun size={size} color="#92400E" strokeWidth={2} />
}

function ShiftBadge({ category }: { category: string }) {
  const key = category?.toLowerCase() ?? "day"
  const colors = ShiftColors[key] ?? ShiftColors["day"]
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{category}</Text>
    </View>
  )
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fullRecord, setFullRecord] = useState<FullRecordType | null>(null)

  const fetchFullRecord = async () => {
    try {
      const response = await api.get("/full_record/")
      setFullRecord(response.data)
      const tz = response.data?.employee?.timezone
      if (tz) AsyncStorage.setItem("hospitalTimezone", tz)
    } catch (error) {
      console.error("Error fetching full record:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchFullRecord() }, [])

  const onRefresh = () => { setRefreshing(true); fetchFullRecord() }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!fullRecord) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load data.</Text>
        <Pressable onPress={fetchFullRecord} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  const tz = fullRecord.employee.timezone || "UTC"
  const weekStart = dayjs().tz(tz).startOf("isoWeek").format("MMM D")
  const weekEnd = dayjs().tz(tz).endOf("isoWeek").format("MMM D")
  const firstName = fullRecord.employee.name.split(" ")[0]

  const formatShiftTime = (start?: string, end?: string) => {
    if (!start || !end) return "—"
    return `${dayjs(start).tz(tz).format("HH:mm")} – ${dayjs(end).tz(tz).format("HH:mm")}`
  }

  const staffingPct = fullRecord.next_shift?.required
    ? Math.round((fullRecord.next_shift.assigned / fullRecord.next_shift.required) * 100)
    : null

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={["#4F46E5", "#6366F1"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
              <Text style={styles.name}>{firstName} 👋</Text>
              <Text style={styles.headerSub}>
                {fullRecord.employee.role} · {fullRecord.employee.team}
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName[0]}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Weekly hours strip */}
          <View style={styles.hoursRow}>
            <View style={[styles.hourCard, { borderColor: Colors.primaryLight }]}>
              <Text style={styles.hourValue}>{fullRecord.weekly_summary.hours_scheduled}h</Text>
              <Text style={styles.hourLabel}>Scheduled</Text>
            </View>
            <View style={[styles.hourCard, { borderColor: Colors.border }]}>
              <Text style={styles.hourValue}>{fullRecord.weekly_summary.hours_worked}h</Text>
              <Text style={styles.hourLabel}>Worked</Text>
            </View>
            <View style={[styles.hourCard, { borderColor: Colors.border }]}>
              <Text style={styles.hourValue}>{fullRecord.weekly_shifts.length}</Text>
              <Text style={styles.hourLabel}>This week</Text>
            </View>
          </View>

          {/* Next Shift */}
          <View style={styles.sectionHeader}>
            <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Next Shift</Text>
          </View>

          {!fullRecord.next_shift ? (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>No upcoming shifts</Text>
              <Text style={styles.emptySubtitle}>You're not scheduled for any shifts right now.</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                if (fullRecord.next_shift?.id) router.push(`/shift/${fullRecord.next_shift.id}`)
              }}
              style={styles.nextShiftCard}
            >
              <LinearGradient
                colors={getShiftGradient(fullRecord.next_shift.category)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextShiftGradient}
              >
                <View style={styles.nextShiftTop}>
                  <ShiftBadge category={fullRecord.next_shift.category} />
                  <ChevronRight size={18} color="#fff" strokeWidth={2} />
                </View>
                <Text style={styles.nextShiftTime}>
                  {formatShiftTime(fullRecord.next_shift.start, fullRecord.next_shift.end)}
                </Text>
                <Text style={styles.nextShiftDate}>
                  {fullRecord.next_shift.start
                    ? dayjs(fullRecord.next_shift.start).tz(tz).format("ddd, MMM D")
                    : ""}
                </Text>
                {staffingPct !== null && (
                  <View style={styles.staffingRow}>
                    <Users size={13} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                    <Text style={styles.staffingText}>
                      {fullRecord.next_shift.assigned}/{fullRecord.next_shift.required} staff
                    </Text>
                    <View style={styles.staffingBar}>
                      <View style={[styles.staffingFill, { width: `${Math.min(staffingPct, 100)}%` as any }]} />
                    </View>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* This week */}
          <View style={styles.sectionHeader}>
            <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>This week · {weekStart} – {weekEnd}</Text>
          </View>

          {fullRecord.weekly_shifts.length === 0 ? (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptySubtitle}>No shifts scheduled this week.</Text>
            </View>
          ) : (
            fullRecord.weekly_shifts.map((shift, i) => {
              const key = shift.category?.toLowerCase() ?? "day"
              const sc = ShiftColors[key] ?? ShiftColors["day"]
              return (
                <View key={i} style={[styles.card, styles.shiftRow]}>
                  <View style={[styles.shiftDot, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <ShiftTypeIcon category={shift.category} size={14} />
                  </View>
                  <View style={styles.shiftRowLeft}>
                    <Text style={styles.shiftRowDay}>{shift.day}</Text>
                    <Text style={styles.shiftRowDate}>{dayjs(shift.date).tz(tz).format("MMM D")}</Text>
                  </View>
                  <View style={styles.shiftRowRight}>
                    <ShiftBadge category={shift.category} />
                    <Text style={styles.shiftRowTime}>
                      {shift.start && shift.end
                        ? `${dayjs.utc(shift.date + "T" + shift.start).tz(tz).format("HH:mm")} – ${dayjs.utc(shift.date + "T" + shift.end).tz(tz).format("HH:mm")}`
                        : "—"}
                    </Text>
                  </View>
                </View>
              )
            })
          )}

          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/schedule") }}
            style={styles.scheduleBtn}
          >
            <Text style={styles.scheduleBtnText}>View Full Schedule</Text>
            <ChevronRight size={16} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}

function getShiftGradient(category: string): [string, string] {
  const lower = category?.toLowerCase() ?? ""
  if (lower.includes("night")) return ["#3730A3", "#4F46E5"]
  if (lower.includes("late")) return ["#0F766E", "#0D9488"]
  if (lower.includes("call")) return ["#BE123C", "#E11D48"]
  return ["#B45309", "#D97706"]
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: 15 },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primaryLight, borderRadius: 10 },
  retryText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 2, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  content: { padding: 16 },
  hoursRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  hourCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1.5, ...Shadow.sm },
  hourValue: { fontSize: 20, fontWeight: "700", color: Colors.text },
  hourLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: "500" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 10, ...Shadow.sm },
  emptyCard: { alignItems: "center", paddingVertical: 24 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  nextShiftCard: { borderRadius: 20, overflow: "hidden", marginBottom: 24, ...Shadow.md },
  nextShiftGradient: { padding: 20 },
  nextShiftTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  nextShiftTime: { fontSize: 28, fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
  nextShiftDate: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  staffingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  staffingText: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  staffingBar: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2, overflow: "hidden" },
  staffingFill: { height: "100%", backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  shiftDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  shiftRowLeft: { flex: 1 },
  shiftRowDay: { fontSize: 14, fontWeight: "600", color: Colors.text },
  shiftRowDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  shiftRowRight: { alignItems: "flex-end", gap: 4 },
  shiftRowTime: { fontSize: 12, color: Colors.textSecondary },
  scheduleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 4, paddingVertical: 14,
    backgroundColor: Colors.primaryLight, borderRadius: 14,
  },
  scheduleBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
})
