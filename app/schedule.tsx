import {
  ScrollView, Text, View, ActivityIndicator,
  TouchableOpacity, RefreshControl, StyleSheet, Pressable,
} from "react-native"
import { router, Stack } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import AsyncStorage from "@react-native-async-storage/async-storage"
dayjs.extend(utc)
dayjs.extend(timezone)
import * as Haptics from "expo-haptics"
import { ChevronRight, Calendar, Sun, Moon, Sunset } from "lucide-react-native"
import { api } from "../api"
import { Colors, Shadow, ShiftColors } from "../constants/theme"

type Assignment = {
  id: number
  status: string
  shift: { id: number; shift_type: string; start: string; end: string; department: string }
}

const WEEK_STEP = 2

function ShiftTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const lower = type?.toLowerCase() ?? ""
  if (lower.includes("night")) return <Moon size={size} color="#3730A3" strokeWidth={2} />
  if (lower.includes("late")) return <Sunset size={size} color="#0F766E" strokeWidth={2} />
  return <Sun size={size} color="#92400E" strokeWidth={2} />
}

export default function ScheduleScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [tz, setTz] = useState("UTC")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [weeks, setWeeks] = useState(WEEK_STEP)
  const [error, setError] = useState(false)

  const fetchSchedule = useCallback(async (weeksAhead: number) => {
    setError(false)
    try {
      const storedTz = await AsyncStorage.getItem("hospitalTimezone") || tz
      const start = dayjs().tz(storedTz).format("YYYY-MM-DD")
      const end = dayjs().add(weeksAhead, "week").tz(storedTz).format("YYYY-MM-DD")
      const res = await api.get(`/shifts/?start=${start}&end=${end}`)
      setAssignments(res.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    AsyncStorage.getItem("hospitalTimezone").then(v => { if (v) setTz(v) })
  }, [])

  useEffect(() => { fetchSchedule(weeks) }, [weeks, fetchSchedule])

  // Group by date
  const grouped = assignments.reduce<Record<string, Assignment[]>>((acc, a) => {
    const date = dayjs(a.shift.start).tz(tz).format("YYYY-MM-DD")
    if (!acc[date]) acc[date] = []
    acc[date].push(a)
    return acc
  }, {})

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "My Schedule", headerStyle: { backgroundColor: Colors.card }, headerTintColor: Colors.text, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => { setRefreshing(true); fetchSchedule(weeks) }} />}
      >
        <Text style={styles.subheading}>Next {weeks} weeks</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Couldn't load your schedule.</Text>
            <Pressable onPress={() => fetchSchedule(weeks)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={40} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No shifts in this period</Text>
            <Text style={styles.emptySubtitle}>You have no scheduled shifts in the next {weeks} weeks.</Text>
          </View>
        ) : (
          Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, shifts]) => {
            const d = dayjs(date)
            const isToday = date === dayjs().tz(tz).format("YYYY-MM-DD")
            return (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <View style={[styles.dateDot, isToday && styles.dateDotToday]} />
                  <Text style={[styles.dateLabel, isToday && styles.dateLabelToday]}>
                    {isToday ? "Today" : d.format("ddd")}
                  </Text>
                  <Text style={styles.dateText}>{d.format("MMM D")}</Text>
                </View>

                {shifts.map((a) => {
                  const key = a.shift.shift_type?.toLowerCase() ?? "day"
                  const sc = ShiftColors[key] ?? ShiftColors["day"]
                  return (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/shift/${a.shift.id}`) }}
                      activeOpacity={0.8}
                      style={styles.shiftCard}
                    >
                      <View style={[styles.shiftTypeIcon, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <ShiftTypeIcon type={a.shift.shift_type} />
                      </View>
                      <View style={styles.shiftInfo}>
                        <Text style={styles.shiftType}>{a.shift.shift_type}</Text>
                        <Text style={styles.shiftDept}>{a.shift.department}</Text>
                      </View>
                      <View style={styles.shiftTime}>
                        <Text style={styles.shiftTimeText}>
                          {dayjs(a.shift.start).tz(tz).format("HH:mm")}
                        </Text>
                        <Text style={styles.shiftTimeEnd}>
                          – {dayjs(a.shift.end).tz(tz).format("HH:mm")}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2} />
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
          })
        )}

        {!loading && !error && (
          <TouchableOpacity
            onPress={() => setWeeks((w) => w + WEEK_STEP)}
            style={styles.loadMoreBtn}
          >
            <Text style={styles.loadMoreText}>Load {WEEK_STEP} more weeks</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  subheading: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  emptyCard: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: "center" },
  retryBtn: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primaryLight, borderRadius: 10 },
  retryText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
  dateGroup: { marginBottom: 8 },
  dateHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, paddingHorizontal: 4 },
  dateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textTertiary },
  dateDotToday: { backgroundColor: Colors.primary, width: 10, height: 10, borderRadius: 5 },
  dateLabel: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, width: 36 },
  dateLabelToday: { color: Colors.primary },
  dateText: { fontSize: 13, color: Colors.textSecondary },
  shiftCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    marginBottom: 6, ...Shadow.sm,
  },
  shiftTypeIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  shiftInfo: { flex: 1 },
  shiftType: { fontSize: 14, fontWeight: "600", color: Colors.text },
  shiftDept: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  shiftTime: { alignItems: "flex-end" },
  shiftTimeText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  shiftTimeEnd: { fontSize: 12, color: Colors.textSecondary },
  loadMoreBtn: {
    marginTop: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: "center",
  },
  loadMoreText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
})
