import {
  ScrollView, Text, View, ActivityIndicator,
  TouchableOpacity, StyleSheet,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import AsyncStorage from "@react-native-async-storage/async-storage"
dayjs.extend(utc)
dayjs.extend(timezone)
import { LinearGradient } from "expo-linear-gradient"
import { Clock, Users, Building2, Briefcase, FileText, UserRound } from "lucide-react-native"
import { api } from "../../api"
import { Colors, Shadow, ShiftColors } from "../../constants/theme"

type ShiftDetail = {
  id: number
  shift_type: string
  start: string
  end: string
  department: string
  team: string
  job: string
  notes: string
  required: number | null
  assigned: number
  coworkers: { employee_id: number; name: string; role: string; status: string }[]
  hospital_timezone: string
}

function getShiftGradient(shiftType: string): [string, string] {
  const lower = shiftType?.toLowerCase() ?? ""
  if (lower.includes("night")) return ["#3730A3", "#4F46E5"]
  if (lower.includes("late")) return ["#0F766E", "#0D9488"]
  if (lower.includes("call")) return ["#BE123C", "#E11D48"]
  return ["#B45309", "#D97706"]
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [shift, setShift] = useState<ShiftDetail | null>(null)
  const [tz, setTz] = useState("UTC")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchDetail = async () => {
    setError(false)
    setLoading(true)
    try {
      const [res, storedTz] = await Promise.all([
        api.get(`/shifts/${id}/detail/`),
        AsyncStorage.getItem("hospitalTimezone"),
      ])
      setShift(res.data)
      setTz(res.data.hospital_timezone || storedTz || "UTC")
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (id) fetchDetail() }, [id])

  const gradientColors = shift ? getShiftGradient(shift.shift_type) : ["#4F46E5", "#6366F1"]

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Shift Details",
          headerTransparent: true,
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "transparent" },
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error || !shift ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn't load this shift.</Text>
          <TouchableOpacity onPress={fetchDetail} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero gradient header */}
          <LinearGradient colors={gradientColors} style={styles.hero}>
            <View style={styles.heroContent}>
              <Text style={styles.heroShiftType}>{shift.shift_type}</Text>
              <Text style={styles.heroTime}>
                {dayjs(shift.start).tz(tz).format("HH:mm")} – {dayjs(shift.end).tz(tz).format("HH:mm")}
              </Text>
              <Text style={styles.heroDate}>
                {dayjs(shift.start).tz(tz).format("dddd, MMMM D")}
              </Text>

              {/* Duration pill */}
              <View style={styles.durationPill}>
                <Clock size={12} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                <Text style={styles.durationText}>
                  {Math.round((new Date(shift.end).getTime() - new Date(shift.start).getTime()) / 36e5)}h shift
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            {/* Details card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Details</Text>
              <DetailRow icon={<Building2 size={16} color={Colors.textSecondary} strokeWidth={1.5} />} label="Department" value={shift.department} />
              <DetailRow icon={<Users size={16} color={Colors.textSecondary} strokeWidth={1.5} />} label="Team" value={shift.team} />
              <DetailRow icon={<Briefcase size={16} color={Colors.textSecondary} strokeWidth={1.5} />} label="Role" value={shift.job} />
              <DetailRow
                icon={<UserRound size={16} color={Colors.textSecondary} strokeWidth={1.5} />}
                label="Staffing"
                value={`${shift.assigned}${shift.required ? ` / ${shift.required}` : ""} assigned`}
                last
              />
              {shift.notes ? (
                <DetailRow icon={<FileText size={16} color={Colors.textSecondary} strokeWidth={1.5} />} label="Notes" value={shift.notes} last />
              ) : null}
            </View>

            {/* Staffing progress */}
            {shift.required && (
              <View style={styles.staffingCard}>
                <View style={styles.staffingHeader}>
                  <Text style={styles.staffingLabel}>Staffing coverage</Text>
                  <Text style={styles.staffingPct}>
                    {Math.round((shift.assigned / shift.required) * 100)}%
                  </Text>
                </View>
                <View style={styles.staffingTrack}>
                  <View
                    style={[
                      styles.staffingFill,
                      {
                        width: `${Math.min((shift.assigned / shift.required) * 100, 100)}%` as any,
                        backgroundColor: shift.assigned >= shift.required ? Colors.success : Colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.staffingCaption}>{shift.assigned} of {shift.required} positions filled</Text>
              </View>
            )}

            {/* Coworkers */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>On This Shift ({shift.coworkers.length})</Text>
              {shift.coworkers.length === 0 ? (
                <Text style={styles.emptyText}>No one assigned yet.</Text>
              ) : (
                shift.coworkers.map((c, i) => (
                  <View key={c.employee_id} style={[styles.coworkerRow, i < shift.coworkers.length - 1 && styles.coworkerBorder]}>
                    <View style={styles.coworkerAvatar}>
                      <Text style={styles.coworkerInitial}>{c.name[0]}</Text>
                    </View>
                    <View style={styles.coworkerInfo}>
                      <Text style={styles.coworkerName}>{c.name}</Text>
                      <Text style={styles.coworkerRole}>{c.role}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}
    </View>
  )
}

function DetailRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: Colors.textSecondary },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primaryLight, borderRadius: 10 },
  retryText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
  hero: { paddingTop: 100, paddingBottom: 32, paddingHorizontal: 24 },
  heroContent: {},
  heroShiftType: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 },
  heroTime: { fontSize: 36, fontWeight: "700", color: "#fff", letterSpacing: -1, marginTop: 4 },
  heroDate: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  durationPill: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 16, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  durationText: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  content: { padding: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...Shadow.sm },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailIcon: { marginTop: 1 },
  detailBody: { flex: 1 },
  detailLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: "500" },
  detailValue: { fontSize: 14, fontWeight: "600", color: Colors.text, marginTop: 1 },
  staffingCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...Shadow.sm },
  staffingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  staffingLabel: { fontSize: 13, fontWeight: "600", color: Colors.text },
  staffingPct: { fontSize: 16, fontWeight: "700", color: Colors.text },
  staffingTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  staffingFill: { height: "100%", borderRadius: 4 },
  staffingCaption: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  coworkerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  coworkerBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  coworkerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  coworkerInitial: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  coworkerInfo: { flex: 1 },
  coworkerName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  coworkerRole: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
})
