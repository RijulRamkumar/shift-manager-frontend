import {
  View, Text, ScrollView, TouchableOpacity, Modal, Alert,
  ActivityIndicator, TextInput, RefreshControl, StyleSheet, Pressable, FlatList, Dimensions,
} from "react-native"
import { Stack } from "expo-router"
import { useCallback, useEffect, useState, useMemo } from "react"
import DateTimePicker from "@react-native-community/datetimepicker"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import AsyncStorage from "@react-native-async-storage/async-storage"
dayjs.extend(utc)
dayjs.extend(timezone)
import * as Haptics from "expo-haptics"
import {
  Plus, Trash2, UserPlus, UserMinus, Clock, Users,
  Calendar, ChevronDown, CheckCircle, Sun, Moon, Sunset,
} from "lucide-react-native"
import { api } from "../api"
import { Colors, Shadow, ShiftColors } from "../constants/theme"

type Team = { id: number; name: string }
type Department = { id: number; name: string; teams: Team[] }
type Job = { id: number; name: string }
type ShiftTypeOption = { value: string; label: string }
type Employee = { id: number; name: string; job: string; department: string; team: string }
type AssignedEmployee = { assignment_id: number; employee_id: number; name: string; status: string }
type Shift = {
  id: number; department_name: string; team_name: string; job_name: string
  shift_type_display: string; start: string; end: string; notes: string
  assigned_count: number; assigned_employees: AssignedEmployee[]
}

function ShiftTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const l = type?.toLowerCase() ?? ""
  if (l.includes("night")) return <Moon size={size} color="#3730A3" strokeWidth={2} />
  if (l.includes("late")) return <Sunset size={size} color="#0F766E" strokeWidth={2} />
  return <Sun size={size} color="#92400E" strokeWidth={2} />
}

function ShiftTypeBadge({ type }: { type: string }) {
  const l = (type ?? "").toLowerCase()
  const key = l.includes("night") ? "night" : l.includes("late") ? "late" : l.includes("call") ? "on_call" : "day"
  const sc = ShiftColors[key] ?? ShiftColors["day"]
  return (
    <View style={[styles.typeBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
      <ShiftTypeIcon type={type} size={12} />
      <Text style={[styles.typeBadgeText, { color: sc.text }]}>{type}</Text>
    </View>
  )
}

function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <View style={[styles.initials, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.38 }]}>{initials.toUpperCase()}</Text>
    </View>
  )
}

export default function ManageShiftsScreen() {
  const [loading, setLoading] = useState(true)
  const [tz, setTz] = useState("UTC")
  const [refreshing, setRefreshing] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeOption[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [jobId, setJobId] = useState<number | null>(null)
  const [shiftType, setShiftType] = useState("")
  const [start, setStart] = useState<Date>(dayjs().add(1, "day").hour(9).minute(0).toDate())
  const [end, setEnd] = useState<Date>(dayjs().add(1, "day").hour(17).minute(0).toDate())
  const [notes, setNotes] = useState("")
  const [picker, setPicker] = useState<null | "start" | "end">(null)
  const [submitting, setSubmitting] = useState(false)

  // Assign
  const [assignShift, setAssignShift] = useState<Shift | null>(null)
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | null>(null)
  const [assignableEmployees, setAssignableEmployees] = useState<Employee[]>([])

  // SelectSheet visibility
  const [showDeptSheet, setShowDeptSheet] = useState(false)
  const [showTeamSheet, setShowTeamSheet] = useState(false)
  const [showJobSheet, setShowJobSheet] = useState(false)
  const [showTypeSheet, setShowTypeSheet] = useState(false)
  const [showEmpSheet, setShowEmpSheet] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [shiftsRes, optionsRes, empRes] = await Promise.all([
        api.get("/manage/shifts/"),
        api.get("/manage/options/"),
        api.get("/manage/assignable-employees/"),
      ])
      setShifts(shiftsRes.data || [])
      setDepartments(optionsRes.data.departments || [])
      setJobs(optionsRes.data.jobs || [])
      setShiftTypes(optionsRes.data.shift_types || [])
      setEmployees(empRes.data || [])
    } catch {
      Alert.alert("Error", "Failed to load scheduling data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    AsyncStorage.getItem("hospitalTimezone").then((v) => { if (v) setTz(v) })
  }, [])

  const selectedDept = departments.find((d) => d.id === departmentId)

  const handleCreate = async () => {
    if (!departmentId || !teamId || !jobId || !shiftType) {
      Alert.alert("Error", "Please fill in department, team, role and shift type"); return
    }
    if (end <= start) { Alert.alert("Error", "End must be after start"); return }
    setSubmitting(true)
    try {
      await api.post("/manage/shifts/", { department: departmentId, team: teamId, job: jobId, shift_type: shiftType, start: start.toISOString(), end: end.toISOString(), notes })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowCreate(false); setNotes("")
      fetchData()
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.end?.[0] || "Failed to create shift")
    } finally { setSubmitting(false) }
  }

  const handleDelete = (shift: Shift) => {
    Alert.alert("Cancel Shift", "This cancels the shift and notifies assigned staff.", [
      { text: "Keep", style: "cancel" },
      { text: "Cancel Shift", style: "destructive", onPress: async () => {
        try { await api.delete(`/manage/shifts/${shift.id}/`); fetchData() }
        catch { Alert.alert("Error", "Failed to cancel shift") }
      }},
    ])
  }

  const handleAssign = async () => {
    if (!assignShift || !assignEmployeeId) return
    setAssigning(true)
    try {
      await api.post(`/manage/shifts/${assignShift.id}/assign/`, { employee_id: assignEmployeeId })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setAssignShift(null); setAssignEmployeeId(null)
      fetchData()
    } catch (err: any) {
      Alert.alert("Cannot assign", err?.response?.data?.error || "Failed to assign employee")
    } finally { setAssigning(false) }
  }

  const handleUnassign = (assignmentId: number) => {
    Alert.alert("Remove", "Remove this employee from the shift?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await api.post(`/manage/assignments/${assignmentId}/unassign/`, {}); fetchData() }
        catch { Alert.alert("Error", "Failed to remove employee") }
      }},
    ])
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: true, title: "Manage Shifts", headerStyle: { backgroundColor: Colors.card }, headerTintColor: Colors.text, headerShadowVisible: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Manage Shifts", headerStyle: { backgroundColor: Colors.card }, headerTintColor: Colors.text, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => { setRefreshing(true); fetchData() }} />}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.countLabel}>{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true) }}
            style={styles.newShiftBtn}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={styles.newShiftBtnText}>New Shift</Text>
          </TouchableOpacity>
        </View>

        {shifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={40} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No shifts scheduled</Text>
            <Text style={styles.emptySub}>Create a shift to get started.</Text>
          </View>
        ) : (
          shifts.map((shift) => {
            const isOpen = expandedId === shift.id
            return (
              <View key={shift.id} style={styles.shiftCard}>
                {/* Card header — tappable */}
                <TouchableOpacity
                  onPress={() => setExpandedId(isOpen ? null : shift.id)}
                  activeOpacity={0.8}
                  style={styles.shiftCardHeader}
                >
                  <View style={styles.shiftCardLeft}>
                    <ShiftTypeBadge type={shift.shift_type_display} />
                    <Text style={styles.shiftJob}>{shift.job_name}</Text>
                    <Text style={styles.shiftMeta}>{shift.department_name} · {shift.team_name}</Text>
                    <View style={styles.shiftTimeRow}>
                      <Clock size={12} color={Colors.textTertiary} strokeWidth={2} />
                      <Text style={styles.shiftTimeText}>
                        {dayjs(shift.start).tz(tz).format("ddd MMM D · HH:mm")} – {dayjs(shift.end).tz(tz).format("HH:mm")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.shiftCardRight}>
                    <View style={styles.assignedPill}>
                      <Users size={12} color={Colors.primary} strokeWidth={2} />
                      <Text style={styles.assignedPillText}>{shift.assigned_count}</Text>
                    </View>
                    <ChevronDown size={16} color={Colors.textTertiary} strokeWidth={2}
                      style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }} />
                  </View>
                </TouchableOpacity>

                {/* Expanded section */}
                {isOpen && (
                  <View style={styles.expandedSection}>
                    <View style={styles.expandedDivider} />
                    <Text style={styles.expandedSectionLabel}>ASSIGNED ({shift.assigned_count})</Text>
                    {shift.assigned_employees.length === 0 ? (
                      <Text style={styles.noAssignedText}>No one assigned yet.</Text>
                    ) : (
                      shift.assigned_employees.map((a) => (
                        <View key={a.assignment_id} style={styles.assigneeRow}>
                          <Initials name={a.name} />
                          <Text style={styles.assigneeName}>{a.name}</Text>
                          <TouchableOpacity onPress={() => handleUnassign(a.assignment_id)} style={styles.removeBtn}>
                            <UserMinus size={14} color={Colors.error} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}

                    <View style={styles.expandedActions}>
                      <TouchableOpacity
                        onPress={async () => {
                          setAssignShift(shift); setAssignEmployeeId(null)
                          try {
                            const res = await api.get(`/manage/assignable-employees/?shift_id=${shift.id}`)
                            setAssignableEmployees(res.data || [])
                          } catch { setAssignableEmployees(employees) }
                        }}
                        style={styles.assignBtn}
                        activeOpacity={0.85}
                      >
                        <UserPlus size={14} color={Colors.primary} strokeWidth={2} />
                        <Text style={styles.assignBtnText}>Assign Employee</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(shift)} style={styles.deleteBtn} activeOpacity={0.85}>
                        <Trash2 size={14} color={Colors.error} strokeWidth={2} />
                        <Text style={styles.deleteBtnText}>Cancel Shift</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Create Shift Modal ── */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Shift</Text>

            <ModalLabel label="Department" />
            <SelectButton
              value={departments.find((d) => d.id === departmentId)?.name ?? ""}
              placeholder="Select department"
              onPress={() => setShowDeptSheet(true)}
            />
            <SelectSheet
              visible={showDeptSheet}
              title="Select Department"
              options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
              selected={departmentId ? String(departmentId) : null}
              onSelect={(v) => { setDepartmentId(Number(v)); setTeamId(null); setShowDeptSheet(false) }}
              onClose={() => setShowDeptSheet(false)}
            />

            <ModalLabel label="Team" />
            <SelectButton
              value={selectedDept?.teams.find((t) => t.id === teamId)?.name ?? ""}
              placeholder={selectedDept ? "Select team" : "Select a department first"}
              disabled={!selectedDept}
              onPress={() => { if (selectedDept) setShowTeamSheet(true) }}
            />
            <SelectSheet
              visible={showTeamSheet}
              title="Select Team"
              options={(selectedDept?.teams ?? []).map((t) => ({ value: String(t.id), label: t.name }))}
              selected={teamId ? String(teamId) : null}
              onSelect={(v) => { setTeamId(Number(v)); setShowTeamSheet(false) }}
              onClose={() => setShowTeamSheet(false)}
            />

            <ModalLabel label="Role" />
            <SelectButton
              value={jobs.find((j) => j.id === jobId)?.name ?? ""}
              placeholder="Select role"
              onPress={() => setShowJobSheet(true)}
            />
            <SelectSheet
              visible={showJobSheet}
              title="Select Role"
              options={jobs.map((j) => ({ value: String(j.id), label: j.name }))}
              selected={jobId ? String(jobId) : null}
              onSelect={(v) => { setJobId(Number(v)); setShowJobSheet(false) }}
              onClose={() => setShowJobSheet(false)}
            />

            <ModalLabel label="Shift Type" />
            <SelectButton
              value={shiftTypes.find((s) => s.value === shiftType)?.label ?? ""}
              placeholder="Select shift type"
              onPress={() => setShowTypeSheet(true)}
            />
            <SelectSheet
              visible={showTypeSheet}
              title="Select Shift Type"
              options={shiftTypes.map((s) => ({ value: s.value, label: s.label }))}
              selected={shiftType || null}
              onSelect={(v) => { setShiftType(v); setShowTypeSheet(false) }}
              onClose={() => setShowTypeSheet(false)}
            />

            <ModalLabel label="Start Time" />
            <Pressable onPress={() => setPicker("start")} style={styles.dateBtn}>
              <Clock size={16} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.dateBtnText}>{dayjs(start).format("ddd MMM D · HH:mm")}</Text>
            </Pressable>

            <ModalLabel label="End Time" />
            <Pressable onPress={() => setPicker("end")} style={styles.dateBtn}>
              <Clock size={16} color={Colors.success} strokeWidth={2} />
              <Text style={styles.dateBtnText}>{dayjs(end).format("ddd MMM D · HH:mm")}</Text>
            </Pressable>

            {picker && (
              <DateTimePicker
                value={picker === "start" ? start : end}
                mode="datetime" display="default"
                onChange={(_, date) => { const w = picker; setPicker(null); if (date) w === "start" ? setStart(date) : setEnd(date) }}
              />
            )}

            <ModalLabel label="Notes (optional)" />
            <TextInput
              placeholder="Any notes for this shift..." placeholderTextColor={Colors.textTertiary}
              value={notes} onChangeText={setNotes} multiline style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreate} disabled={submitting}
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Create</Text>}
              </Pressable>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Assign Employee Modal ── */}
      <Modal visible={!!assignShift} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assign Employee</Text>
            {assignShift && (
              <View style={styles.assignShiftInfo}>
                <ShiftTypeBadge type={assignShift.shift_type_display} />
                <Text style={styles.assignShiftDetail}>{assignShift.department_name} · {assignShift.team_name}</Text>
                <Text style={styles.assignShiftDetail}>{dayjs(assignShift.start).tz(tz).format("ddd MMM D · HH:mm")} – {dayjs(assignShift.end).tz(tz).format("HH:mm")}</Text>
              </View>
            )}
            <ModalLabel label="Select Employee" />
            <SelectButton
              value={assignEmployeeId ? (() => { const e = assignableEmployees.find((x) => x.id === assignEmployeeId); return e ? `${e.name} (${e.job})` : "" })() : ""}
              placeholder="Select employee"
              onPress={() => setShowEmpSheet(true)}
            />
            <SelectSheet
              visible={showEmpSheet}
              title="Select Employee"
              options={assignableEmployees.map((e) => ({
                value: String(e.id),
                label: e.name,
                sublabel: e.job,
                meta: `${e.department} · ${e.team}`,
              }))}
              selected={assignEmployeeId ? String(assignEmployeeId) : null}
              onSelect={(v) => { setAssignEmployeeId(Number(v)); setShowEmpSheet(false) }}
              onClose={() => setShowEmpSheet(false)}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setAssignShift(null); setAssignEmployeeId(null) }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAssign} disabled={!assignEmployeeId || assigning}
                style={[styles.submitBtn, (!assignEmployeeId || assigning) && { opacity: 0.5 }]}>
                {assigning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Assign</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ModalLabel({ label }: { label: string }) {
  return <Text style={styles.modalLabel}>{label}</Text>
}

function SelectButton({ value, placeholder = "Select an option", disabled, onPress }: {
  value: string; placeholder?: string; disabled?: boolean; onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={[styles.selectBtn, disabled && styles.selectBtnDisabled]}>
      <Text style={[styles.selectBtnText, !value && styles.selectBtnPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <ChevronDown size={16} color={Colors.textTertiary} strokeWidth={2} />
    </Pressable>
  )
}

const SCREEN_HEIGHT = Dimensions.get("window").height

function SelectSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean
  title: string
  options: { value: string; label: string; sublabel?: string; meta?: string }[]
  selected: string | null
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase()) ||
        o.meta?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Text style={styles.sheetCount}>{filtered.length} option{filtered.length !== 1 ? "s" : ""}</Text>
          </View>

          {options.length > 5 && (
            <View style={styles.sheetSearch}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={Colors.textTertiary}
                style={styles.sheetSearchInput}
                autoCorrect={false}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyText}>No matches for "{query}"</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selected === item.value
              return (
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(item.value) }}
                  style={[styles.sheetOption, isSelected && styles.sheetOptionSelected]}
                  activeOpacity={0.75}
                >
                  <View style={styles.sheetOptionBody}>
                    <Text style={[styles.sheetOptionLabel, isSelected && styles.sheetOptionLabelSelected]}>
                      {item.label}
                    </Text>
                    {item.sublabel ? <Text style={styles.sheetOptionSublabel}>{item.sublabel}</Text> : null}
                    {item.meta ? <Text style={styles.sheetOptionMeta}>{item.meta}</Text> : null}
                  </View>
                  {isSelected && <CheckCircle size={18} color={Colors.primary} strokeWidth={2} />}
                </TouchableOpacity>
              )
            }}
            ItemSeparatorComponent={() => <View style={styles.sheetSeparator} />}
          />

          <Pressable onPress={onClose} style={styles.sheetCancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  scroll: { padding: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  countLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  newShiftBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, ...Shadow.sm },
  newShiftBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyCard: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
  shiftCard: { backgroundColor: Colors.card, borderRadius: 16, marginBottom: 10, overflow: "hidden", ...Shadow.sm },
  shiftCardHeader: { flexDirection: "row", padding: 16, justifyContent: "space-between", alignItems: "flex-start" },
  shiftCardLeft: { flex: 1, gap: 4 },
  shiftCardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 2 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  shiftJob: { fontSize: 15, fontWeight: "700", color: Colors.text },
  shiftMeta: { fontSize: 12, color: Colors.textSecondary },
  shiftTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  shiftTimeText: { fontSize: 12, color: Colors.textSecondary },
  assignedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  assignedPillText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  expandedSection: { paddingHorizontal: 16, paddingBottom: 16 },
  expandedDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  expandedSectionLabel: { fontSize: 11, fontWeight: "700", color: Colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  noAssignedText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  assigneeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  initials: { backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  initialsText: { fontWeight: "700", color: Colors.primary },
  assigneeName: { flex: 1, fontSize: 14, fontWeight: "500", color: Colors.text },
  removeBtn: { padding: 6, borderRadius: 8, backgroundColor: Colors.errorLight },
  expandedActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  assignBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 10 },
  assignBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
  deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: Colors.error, borderRadius: 10, paddingVertical: 10 },
  deleteBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, letterSpacing: -0.3, marginBottom: 4 },
  modalLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6, marginTop: 14 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 13, backgroundColor: Colors.background },
  dateBtnText: { fontSize: 15, color: Colors.text, fontWeight: "500" },
  textArea: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text, minHeight: 80, textAlignVertical: "top", backgroundColor: Colors.background },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontWeight: "600", color: Colors.textSecondary, fontSize: 15 },
  submitBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  assignShiftInfo: { backgroundColor: Colors.background, borderRadius: 12, padding: 12, gap: 4, marginBottom: 4 },
  assignShiftDetail: { fontSize: 13, color: Colors.textSecondary },
  // SelectButton
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, backgroundColor: Colors.background,
  },
  selectBtnDisabled: { opacity: 0.45 },
  selectBtnText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: "500", marginRight: 8 },
  selectBtnPlaceholder: { color: Colors.textTertiary, fontWeight: "400" },
  // SelectSheet
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheetContainer: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  sheetCount: { fontSize: 12, color: Colors.textTertiary, fontWeight: "500" },
  sheetSearch: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.background },
  sheetSearchInput: { fontSize: 15, color: Colors.text },
  sheetOption: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 },
  sheetOptionSelected: { backgroundColor: Colors.primaryLight },
  sheetOptionBody: { flex: 1, marginRight: 12 },
  sheetOptionLabel: { fontSize: 15, fontWeight: "600", color: Colors.text },
  sheetOptionLabelSelected: { color: Colors.primary },
  sheetOptionSublabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sheetOptionMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, fontWeight: "500" },
  sheetSeparator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },
  sheetEmpty: { paddingVertical: 32, alignItems: "center" },
  sheetEmptyText: { fontSize: 14, color: Colors.textSecondary },
  sheetCancelBtn: { margin: 16, marginTop: 8, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
})
