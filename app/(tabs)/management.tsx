import {
  View, Text, ScrollView, TouchableOpacity, Modal, Alert,
  ActivityIndicator, TextInput, RefreshControl, StyleSheet, Pressable, FlatList, Dimensions,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import DateTimePicker from "@react-native-community/datetimepicker"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
dayjs.extend(utc)
dayjs.extend(timezone)
import * as Haptics from "expo-haptics"
import {
  ArrowLeftRight, Calendar, Clock, CheckCircle, XCircle,
  ChevronRight, ChevronDown, Plus, Users, Sun, Moon, Sunset,
} from "lucide-react-native"
import { api } from "../../api"
import { Colors, Shadow, StatusColors } from "../../constants/theme"

interface Shift {
  id: number; start: string; end: string; shift_type: string; department?: string
}
interface ShiftAssignment {
  id: number; shift: Shift; employee_id?: number; employee_name?: string
}
interface TimeOffRequest {
  id: number; employee_name: string; time_off_type: string
  start_date: string; end_date: string; status: string; reason?: string
}
interface ShiftSwapRequest {
  id: number; requester_name: string; target_name: string; status: string; reason?: string
  requester_shift_info: { shift_type: string; start: string; end: string; department: string }
  target_shift_info: { shift_type: string; start: string; end: string; department: string }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = StatusColors[status] ?? { bg: Colors.background, text: Colors.textSecondary }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{label}</Text>
    </View>
  )
}

function Initials({ name, size = 36 }: { name: string; size?: number }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <View style={[styles.initialsCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initialsText}>{initials.toUpperCase()}</Text>
    </View>
  )
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />
}

export default function ManagementScreen() {
  const [userRole, setUserRole] = useState("")
  const [tz, setTz] = useState("UTC")
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [selectedSwapDetail, setSelectedSwapDetail] = useState<ShiftSwapRequest | null>(null)
  const [userShifts, setUserShifts] = useState<ShiftAssignment[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [outgoingSwapRequests, setOutgoingSwapRequests] = useState<ShiftSwapRequest[]>([])
  const [incomingSwapRequests, setIncomingSwapRequests] = useState<ShiftSwapRequest[]>([])
  const [allSwapRequests, setAllSwapRequests] = useState<ShiftSwapRequest[]>([])
  const [targetShifts, setTargetShifts] = useState<ShiftAssignment[]>([])
  const [selectedMyShift, setSelectedMyShift] = useState<string | null>(null)
  const [selectedTargetShift, setSelectedTargetShift] = useState<string | null>(null)
  const [swapReason, setSwapReason] = useState("")
  const [timeOffType, setTimeOffType] = useState("annual_leave")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [timeOffReason, setTimeOffReason] = useState("")
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingSwaps, setLoadingSwaps] = useState(false)
  const [showLeaveSheet, setShowLeaveSheet] = useState(false)
  const [showMyShiftSheet, setShowMyShiftSheet] = useState(false)
  const [showTargetShiftSheet, setShowTargetShiftSheet] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem("userRole").then((r) => { if (r) setUserRole(r) })
    AsyncStorage.getItem("hospitalTimezone").then((v) => { if (v) setTz(v) })
  }, [])

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [shiftsRes, timeOffRes, swapsRes] = await Promise.all([
        api.get("/shifts/"),
        api.get("/time-off-requests/"),
        api.get("/shifts/swap-requests/"),
      ])
      setUserShifts(shiftsRes.data || [])
      setTimeOffRequests(timeOffRes.data || [])
      if (userRole && ["admin", "admin_staff"].includes(userRole)) {
        setAllSwapRequests(swapsRes.data.incoming || [])
      } else {
        setOutgoingSwapRequests(swapsRes.data.outgoing || [])
        setIncomingSwapRequests(swapsRes.data.incoming || [])
      }
    } catch {
      Alert.alert("Error", "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [userRole])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  const fetchAvailableShifts = useCallback(async () => {
    try {
      const res = await api.get("/shifts/available/")
      setTargetShifts(res.data || [])
    } catch {}
  }, [])

  useEffect(() => { fetchAvailableShifts() }, [fetchAvailableShifts])

  const isAdmin = ["admin", "admin_staff"].includes(userRole)

  const handleCreateSwap = async () => {
    if (!selectedMyShift || !selectedTargetShift) {
      Alert.alert("Error", "Please select both shifts"); return
    }
    try {
      setLoadingSwaps(true)
      await api.post("/shifts/swap-request/", {
        requester_assignment_id: selectedMyShift,
        target_assignment_id: selectedTargetShift,
        reason: swapReason,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Request Sent", "Your shift swap request has been submitted.")
      setShowSwapModal(false)
      setSelectedMyShift(null); setSelectedTargetShift(null); setSwapReason("")
      fetchAllData()
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert("Error", err?.response?.data?.error || "Failed to create swap request")
    } finally {
      setLoadingSwaps(false)
    }
  }

  const handleCreateTimeOff = async () => {
    if (!startDate || !endDate) { Alert.alert("Error", "Please select both dates"); return }
    if (endDate < startDate) { Alert.alert("Error", "End date cannot be before start date"); return }
    const fmt = (d: Date) => d.toISOString().split("T")[0]
    try {
      setLoading(true)
      await api.post("/time-off-requests/create/", { time_off_type: timeOffType, start_date: fmt(startDate), end_date: fmt(endDate), reason: timeOffReason })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Submitted", "Your time off request has been submitted for approval.")
      setShowTimeOffModal(false)
      setStartDate(null); setEndDate(null); setTimeOffReason(""); setTimeOffType("annual_leave")
      fetchAllData()
    } catch {
      Alert.alert("Error", "Failed to create time off request")
    } finally {
      setLoading(false)
    }
  }

  const handleApproveSwap = async (id: number) => {
    try {
      setLoadingSwaps(true)
      await api.post(`/shifts/swap-requests/${id}/approve/`, {})
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Approved", "Shift swap has been approved.")
      fetchAllData()
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Failed to approve swap request")
    } finally {
      setLoadingSwaps(false)
    }
  }

  const handleRejectSwap = async (id: number) => {
    try {
      setLoadingSwaps(true)
      await api.post(`/shifts/swap-requests/${id}/reject-approval/`, {})
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      fetchAllData()
    } catch {
      Alert.alert("Error", "Failed to reject swap request")
    } finally {
      setLoadingSwaps(false)
    }
  }

  const handleAcceptSwap = async (id: number) => {
    try {
      setLoadingSwaps(true)
      await api.post(`/shifts/swap-requests/${id}/accept/`, {})
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Accepted", "You've accepted the swap request. Waiting for admin approval.")
      fetchAllData()
    } catch {
      Alert.alert("Error", "Failed to accept swap request")
    } finally {
      setLoadingSwaps(false)
    }
  }

  const handleApproveTimeOff = async (id: number) => {
    try {
      setLoading(true)
      await api.post(`/time-off-requests/${id}/approve/`, {})
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      fetchAllData()
    } catch { Alert.alert("Error", "Failed to approve time off request") } finally { setLoading(false) }
  }

  const handleRejectTimeOff = async (id: number) => {
    try {
      setLoading(true)
      await api.post(`/time-off-requests/${id}/reject/`, {})
      fetchAllData()
    } catch { Alert.alert("Error", "Failed to reject time off request") } finally { setLoading(false) }
  }

  const handleCancelTimeOff = (id: number) => {
    Alert.alert("Withdraw Request", "Are you sure you want to withdraw this time off request?", [
      { text: "Keep", style: "cancel" },
      { text: "Withdraw", style: "destructive", onPress: async () => {
        try { await api.post(`/time-off-requests/${id}/cancel/`, {}); fetchAllData() }
        catch { Alert.alert("Error", "Failed to cancel request") }
      }},
    ])
  }

  const pendingApprovals = allSwapRequests.filter((r) => r.status === "accepted")
  const awaitingResponse = allSwapRequests.filter((r) => r.status === "pending")

  if (loading && !userRole) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{isAdmin ? "Requests" : "My Requests"}</Text>
          <Text style={styles.headerSub}>
            {isAdmin ? "Manage staff requests" : "Time off & shift swaps"}
          </Text>
        </View>
        {isAdmin && pendingApprovals.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingApprovals.length} pending</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchAllData} tintColor={Colors.primary} />}
      >
        <View style={styles.content}>

          {/* ---- TIME OFF ---- */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Time Off Requests</Text>
              {isAdmin && <View style={styles.adminPill}><Text style={styles.adminPillText}>Admin</Text></View>}
            </View>

            {timeOffRequests.length === 0 ? (
              <EmptyState icon={<Calendar size={28} color={Colors.textTertiary} strokeWidth={1.5} />} text="No time off requests" />
            ) : (
              timeOffRequests.map((req) => (
                <TimeOffCard
                  key={req.id} request={req} isAdmin={isAdmin}
                  onApprove={() => handleApproveTimeOff(req.id)}
                  onReject={() => handleRejectTimeOff(req.id)}
                  onCancel={() => handleCancelTimeOff(req.id)}
                />
              ))
            )}

            {!isAdmin && (
              <ActionButton icon={<Plus size={16} color="#fff" strokeWidth={2.5} />} label="Request Time Off" onPress={() => setShowTimeOffModal(true)} />
            )}
          </View>

          {/* ---- SHIFT SWAPS ---- */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ArrowLeftRight size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Shift Swaps</Text>
            </View>

            {!isAdmin ? (
              <>
                {/* Outgoing */}
                <Text style={styles.subLabel}>Your Requests</Text>
                {outgoingSwapRequests.length === 0
                  ? <EmptyState icon={<ArrowLeftRight size={24} color={Colors.textTertiary} strokeWidth={1.5} />} text="No outgoing requests" compact />
                  : outgoingSwapRequests.map((req) => (
                    <SwapCard key={req.id} request={req} type="outgoing"
                      onPress={() => setSelectedSwapDetail(req)} />
                  ))}

                <SectionDivider />

                {/* Incoming */}
                <Text style={styles.subLabel}>Requests For You</Text>
                {incomingSwapRequests.length === 0
                  ? <EmptyState icon={<Users size={24} color={Colors.textTertiary} strokeWidth={1.5} />} text="No incoming requests" compact />
                  : incomingSwapRequests.map((req) => (
                    <SwapCard key={req.id} request={req} type="incoming"
                      onPress={() => setSelectedSwapDetail(req)}
                      onAccept={() => handleAcceptSwap(req.id)}
                      onReject={async () => {
                        try {
                          await api.post(`/shifts/swap-requests/${req.id}/reject/`, {})
                          Alert.alert("Rejected", "Swap request declined.")
                          fetchAllData()
                        } catch { Alert.alert("Error", "Failed to reject request") }
                      }}
                    />
                  ))}

                <ActionButton icon={<Plus size={16} color="#fff" strokeWidth={2.5} />} label="Request Shift Swap"
                  onPress={() => { fetchAvailableShifts(); setShowSwapModal(true) }} />
              </>
            ) : (
              <>
                {/* Pending admin approval */}
                <Text style={styles.subLabel}>Awaiting Your Approval</Text>
                {pendingApprovals.length === 0
                  ? <EmptyState icon={<CheckCircle size={24} color={Colors.textTertiary} strokeWidth={1.5} />} text="No pending approvals" compact />
                  : pendingApprovals.map((req) => (
                    <AdminSwapCard key={req.id} request={req} tz={tz}
                      onPress={() => setSelectedSwapDetail(req)}
                      onApprove={() => handleApproveSwap(req.id)}
                      onReject={() => handleRejectSwap(req.id)}
                      loading={loadingSwaps}
                    />
                  ))}

                <SectionDivider />

                {/* Waiting on employees */}
                <Text style={styles.subLabel}>Awaiting Employee Response</Text>
                {awaitingResponse.length === 0
                  ? <EmptyState icon={<Clock size={24} color={Colors.textTertiary} strokeWidth={1.5} />} text="No requests waiting on employees" compact />
                  : awaitingResponse.map((req) => (
                    <TouchableOpacity key={req.id} style={styles.awaitingCard} onPress={() => setSelectedSwapDetail(req)} activeOpacity={0.8}>
                      <View style={styles.awaitingLeft}>
                        <Initials name={req.requester_name} size={36} />
                        <View>
                          <Text style={styles.awaitingNames}>{req.requester_name} → {req.target_name}</Text>
                          <Text style={styles.awaitingShifts}>{req.requester_shift_info.shift_type} ↔ {req.target_shift_info.shift_type}</Text>
                        </View>
                      </View>
                      <View style={styles.waitingBadge}>
                        <Text style={styles.waitingBadgeText}>Waiting</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </>
            )}
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Swap Detail Modal */}
      <Modal visible={!!selectedSwapDetail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedSwapDetail && (
              <>
                <Text style={styles.modalTitle}>Swap Details</Text>
                <Text style={styles.modalStatus}>
                  Status: <Text style={{ color: StatusColors[selectedSwapDetail.status]?.text ?? Colors.text, fontWeight: "700" }}>{selectedSwapDetail.status}</Text>
                </Text>

                <SwapSideCard label={`From · ${selectedSwapDetail.requester_name}`} info={selectedSwapDetail.requester_shift_info} color={Colors.primary} tz={tz} />
                <View style={styles.swapArrow}><ArrowLeftRight size={20} color={Colors.textTertiary} strokeWidth={2} /></View>
                <SwapSideCard label={`To · ${selectedSwapDetail.target_name}`} info={selectedSwapDetail.target_shift_info} color={Colors.success} tz={tz} />

                {selectedSwapDetail.reason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason</Text>
                    <Text style={styles.reasonText}>{selectedSwapDetail.reason}</Text>
                  </View>
                ) : null}

                <Pressable onPress={() => setSelectedSwapDetail(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Time Off Modal */}
      <Modal visible={showTimeOffModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Request Time Off</Text>

            <ModalLabel label="Leave Type" />
            <SelectButton
              value={LEAVE_TYPES.find((t) => t.value === timeOffType)?.label ?? ""}
              onPress={() => setShowLeaveSheet(true)}
            />
            <SelectSheet
              visible={showLeaveSheet}
              title="Select Leave Type"
              options={LEAVE_TYPES}
              selected={timeOffType}
              onSelect={(v) => { setTimeOffType(v); setShowLeaveSheet(false) }}
              onClose={() => setShowLeaveSheet(false)}
            />

            <ModalLabel label="Start Date" />
            <Pressable onPress={() => setShowStartPicker(true)} style={styles.dateBtn}>
              <Calendar size={16} color={Colors.primary} strokeWidth={2} />
              <Text style={[styles.dateBtnText, !startDate && { color: Colors.textTertiary }]}>
                {startDate ? dayjs(startDate).format("MMM D, YYYY") : "Select start date"}
              </Text>
            </Pressable>
            {showStartPicker && (
              <DateTimePicker value={startDate || new Date()} mode="date" display="default"
                onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d) }} />
            )}

            <ModalLabel label="End Date" />
            <Pressable onPress={() => setShowEndPicker(true)} style={styles.dateBtn}>
              <Calendar size={16} color={Colors.success} strokeWidth={2} />
              <Text style={[styles.dateBtnText, !endDate && { color: Colors.textTertiary }]}>
                {endDate ? dayjs(endDate).format("MMM D, YYYY") : "Select end date"}
              </Text>
            </Pressable>
            {showEndPicker && (
              <DateTimePicker value={endDate || new Date()} mode="date" display="default"
                onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d) }} />
            )}

            <ModalLabel label="Reason (optional)" />
            <TextInput
              value={timeOffReason} onChangeText={setTimeOffReason}
              placeholder="Add a note..." placeholderTextColor={Colors.textTertiary}
              multiline style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowTimeOffModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreateTimeOff} disabled={loading} style={styles.submitBtn}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </Pressable>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Swap Request Modal */}
      <Modal visible={showSwapModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Request Shift Swap</Text>
            <Text style={styles.modalSubtitle}>Select a shift to give away and a colleague's shift you want.</Text>

            <ModalLabel label="Your shift to give away" />
            {userShifts.length === 0
              ? <View style={styles.emptyPicker}><Text style={styles.emptyPickerText}>No upcoming shifts to swap.</Text></View>
              : <>
                  <SelectButton
                    value={selectedMyShift
                      ? (() => { const a = userShifts.find((x) => String(x.id) === selectedMyShift); return a ? `${a.shift.shift_type} · ${dayjs(a.shift.start).tz(tz).format("ddd MMM D · HH:mm")}` : "" })()
                      : ""}
                    placeholder="Select your shift"
                    onPress={() => setShowMyShiftSheet(true)}
                  />
                  <SelectSheet
                    visible={showMyShiftSheet}
                    title="Your Shift to Give Away"
                    options={userShifts.map((a) => ({
                      value: String(a.id),
                      label: a.shift.shift_type,
                      sublabel: `${dayjs(a.shift.start).tz(tz).format("ddd MMM D · HH:mm")} – ${dayjs(a.shift.end).tz(tz).format("HH:mm")}`,
                      meta: a.shift.department,
                    }))}
                    selected={selectedMyShift}
                    onSelect={(v) => { setSelectedMyShift(v); setShowMyShiftSheet(false) }}
                    onClose={() => setShowMyShiftSheet(false)}
                  />
                </>
            }

            <ModalLabel label="Colleague's shift you want" />
            {targetShifts.length === 0
              ? <View style={styles.emptyPicker}><Text style={styles.emptyPickerText}>No eligible colleague shifts available.</Text></View>
              : <>
                  <SelectButton
                    value={selectedTargetShift
                      ? (() => { const a = targetShifts.find((x) => String(x.id) === selectedTargetShift); return a ? `${a.employee_name ?? "Colleague"} · ${a.shift.shift_type} · ${dayjs(a.shift.start).tz(tz).format("ddd MMM D · HH:mm")}` : "" })()
                      : ""}
                    placeholder="Select colleague's shift"
                    onPress={() => setShowTargetShiftSheet(true)}
                  />
                  <SelectSheet
                    visible={showTargetShiftSheet}
                    title="Colleague's Shift You Want"
                    options={targetShifts.map((a) => ({
                      value: String(a.id),
                      label: `${a.employee_name ?? "Colleague"} · ${a.shift.shift_type}`,
                      sublabel: `${dayjs(a.shift.start).tz(tz).format("ddd MMM D · HH:mm")} – ${dayjs(a.shift.end).tz(tz).format("HH:mm")}`,
                      meta: a.shift.department,
                    }))}
                    selected={selectedTargetShift}
                    onSelect={(v) => { setSelectedTargetShift(v); setShowTargetShiftSheet(false) }}
                    onClose={() => setShowTargetShiftSheet(false)}
                  />
                </>
            }

            <ModalLabel label="Reason (optional)" />
            <TextInput
              value={swapReason} onChangeText={setSwapReason}
              placeholder="Why do you want to swap?" placeholderTextColor={Colors.textTertiary}
              multiline style={styles.textArea}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowSwapModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreateSwap} disabled={loadingSwaps || !selectedMyShift || !selectedTargetShift}
                style={[styles.submitBtn, (!selectedMyShift || !selectedTargetShift) && { opacity: 0.5 }]}>
                {loadingSwaps ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Send Request</Text>}
              </Pressable>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon, text, compact }: { icon: React.ReactNode; text: string; compact?: boolean }) {
  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
      {icon}
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  )
}

function ActionButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress() }} style={styles.actionBtn} activeOpacity={0.85}>
      {icon}
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

const LEAVE_TYPES = [
  { value: "annual_leave", label: "Annual Leave", sublabel: "Paid time off for holidays or personal use" },
  { value: "personal_leave", label: "Personal Leave", sublabel: "For personal matters or appointments" },
  { value: "sick_leave", label: "Sick Leave", sublabel: "When you're unwell and unable to work" },
  { value: "unpaid_leave", label: "Unpaid Leave", sublabel: "Approved leave without pay" },
  { value: "other", label: "Other", sublabel: "Other leave type" },
]

function ModalLabel({ label }: { label: string }) {
  return <Text style={styles.modalLabel}>{label}</Text>
}

function SelectButton({ value, placeholder = "Select an option", onPress }: {
  value: string; placeholder?: string; onPress: () => void
}) {
  const hasValue = !!value
  return (
    <Pressable onPress={onPress} style={styles.selectBtn}>
      <Text style={[styles.selectBtnText, !hasValue && styles.selectBtnPlaceholder]} numberOfLines={1}>
        {hasValue ? value : placeholder}
      </Text>
      <ChevronDown size={16} color={Colors.textTertiary} strokeWidth={2} />
    </Pressable>
  )
}

const SCREEN_HEIGHT = Dimensions.get("window").height

function SelectSheet({ visible, title, options, selected, onSelect, onClose, searchable }: {
  visible: boolean
  title: string
  options: { value: string; label: string; sublabel?: string; meta?: string }[]
  selected: string | null
  onSelect: (value: string) => void
  onClose: () => void
  searchable?: boolean
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

          {(searchable || options.length > 5) && (
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
                    {item.sublabel ? <Text style={styles.sheetOptionSublabel} numberOfLines={2}>{item.sublabel}</Text> : null}
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

function TimeOffCard({ request, isAdmin, onApprove, onReject, onCancel }: {
  request: TimeOffRequest; isAdmin: boolean
  onApprove: () => void; onReject: () => void; onCancel: () => void
}) {
  const typeLabel = request.time_off_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestCardTop}>
        <View style={styles.requestCardLeft}>
          {isAdmin && <Text style={styles.requestEmployee}>{request.employee_name}</Text>}
          <Text style={styles.requestType}>{typeLabel}</Text>
          <Text style={styles.requestDates}>{request.start_date} → {request.end_date}</Text>
          {request.reason ? <Text style={styles.requestReason}>{request.reason}</Text> : null}
        </View>
        <StatusBadge status={request.status} />
      </View>
      {isAdmin && request.status === "pending" && (
        <View style={styles.requestActions}>
          <TouchableOpacity onPress={onApprove} style={styles.approveBtn}>
            <CheckCircle size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReject} style={styles.rejectBtn}>
            <XCircle size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isAdmin && request.status === "pending" && (
        <TouchableOpacity onPress={onCancel} style={styles.withdrawBtn}>
          <Text style={styles.withdrawBtnText}>Withdraw Request</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function SwapCard({ request, type, onPress, onAccept, onReject }: {
  request: ShiftSwapRequest; type: "incoming" | "outgoing"
  onPress?: () => void; onAccept?: () => void; onReject?: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.requestCard} activeOpacity={0.8}>
      <View style={styles.requestCardTop}>
        <View style={styles.swapNames}>
          <Initials name={type === "incoming" ? request.requester_name : request.target_name} size={32} />
          <View>
            <Text style={styles.swapNameText}>
              {type === "incoming" ? `${request.requester_name} → You` : `You → ${request.target_name}`}
            </Text>
            <Text style={styles.swapShiftTypes}>{request.requester_shift_info.shift_type} ↔ {request.target_shift_info.shift_type}</Text>
          </View>
        </View>
        <StatusBadge status={request.status} />
      </View>
      {type === "incoming" && request.status === "pending" && (
        <View style={styles.requestActions}>
          <TouchableOpacity onPress={onAccept} style={styles.approveBtn}>
            <CheckCircle size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.approveBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReject} style={styles.rejectBtn}>
            <XCircle size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      {type === "outgoing" && (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tap to view details</Text>
          <ChevronRight size={13} color={Colors.textTertiary} strokeWidth={2} />
        </View>
      )}
    </TouchableOpacity>
  )
}

function AdminSwapCard({ request, tz, onPress, onApprove, onReject, loading }: {
  request: ShiftSwapRequest; tz: string; onPress: () => void; onApprove: () => void; onReject: () => void; loading: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.requestCard, styles.adminSwapCard]} activeOpacity={0.8}>
      <View style={styles.adminSwapStripe} />
      <View style={styles.adminSwapBody}>
        <View style={styles.adminSwapNames}>
          <Initials name={request.requester_name} size={34} />
          <View>
            <Text style={styles.adminSwapNameText}>{request.requester_name} ↔ {request.target_name}</Text>
            <Text style={styles.swapShiftTypes}>{request.requester_shift_info.shift_type} ↔ {request.target_shift_info.shift_type}</Text>
            <Text style={styles.swapDate}>{dayjs(request.requester_shift_info.start).tz(tz).format("ddd MMM D")}</Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity onPress={onApprove} disabled={loading} style={styles.approveBtn}>
            <CheckCircle size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReject} disabled={loading} style={styles.rejectBtn}>
            <XCircle size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function SwapSideCard({ label, info, color, tz }: { label: string; info: any; color: string; tz: string }) {
  return (
    <View style={[styles.swapSideCard, { borderLeftColor: color }]}>
      <Text style={[styles.swapSideLabel, { color }]}>{label}</Text>
      <Text style={styles.swapSideType}>{info.shift_type}</Text>
      <Text style={styles.swapSideTime}>{dayjs(info.start).tz(tz).format("ddd MMM D · HH:mm")} – {dayjs(info.end).tz(tz).format("HH:mm")}</Text>
      <Text style={styles.swapSideDept}>{info.department}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  pendingBadge: { backgroundColor: Colors.warningLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 12, fontWeight: "700", color: Colors.warning },
  content: { padding: 16 },
  section: { backgroundColor: Colors.card, borderRadius: 20, padding: 16, marginBottom: 16, ...Shadow.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: Colors.text, textTransform: "uppercase", letterSpacing: 0.4 },
  adminPill: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  adminPillText: { fontSize: 11, fontWeight: "600", color: Colors.primary },
  subLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8, paddingHorizontal: 2 },
  sectionDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  emptyState: { alignItems: "center", padding: 24, gap: 8 },
  emptyStateCompact: { padding: 16 },
  emptyStateText: { fontSize: 13, color: Colors.textSecondary },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, marginTop: 12, ...Shadow.sm },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  requestCard: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  requestCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  requestCardLeft: { flex: 1, marginRight: 10 },
  requestEmployee: { fontSize: 11, color: Colors.textTertiary, fontWeight: "500", marginBottom: 2 },
  requestType: { fontSize: 15, fontWeight: "700", color: Colors.text },
  requestDates: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  requestReason: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: "italic" },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 10 },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.error, borderRadius: 10, paddingVertical: 10 },
  rejectBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  withdrawBtn: { marginTop: 10, borderWidth: 1, borderColor: Colors.error, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  withdrawBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  initialsCircle: { backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  initialsText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  swapNames: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 10 },
  swapNameText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  swapShiftTypes: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  swapDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  tapHint: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 2 },
  tapHintText: { fontSize: 11, color: Colors.textTertiary },
  awaitingCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.background, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  awaitingLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  awaitingNames: { fontSize: 13, fontWeight: "600", color: Colors.text },
  awaitingShifts: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  waitingBadge: { backgroundColor: Colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  waitingBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.warning },
  adminSwapCard: { padding: 0, overflow: "hidden", flexDirection: "row" },
  adminSwapStripe: { width: 4, backgroundColor: Colors.warning },
  adminSwapBody: { flex: 1, padding: 14 },
  adminSwapNames: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 },
  adminSwapNameText: { fontSize: 14, fontWeight: "700", color: Colors.text },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, letterSpacing: -0.3, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20 },
  modalStatus: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6, marginTop: 14 },
  emptyPicker: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 14, backgroundColor: Colors.background },
  emptyPickerText: { color: Colors.textSecondary, fontSize: 13 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 13, backgroundColor: Colors.background },
  dateBtnText: { fontSize: 15, color: Colors.text, fontWeight: "500" },
  textArea: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text, minHeight: 80, textAlignVertical: "top", backgroundColor: Colors.background },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontWeight: "600", color: Colors.textSecondary, fontSize: 15 },
  submitBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  closeBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  swapArrow: { alignItems: "center", marginVertical: 8 },
  swapSideCard: { borderLeftWidth: 3, borderRadius: 10, padding: 12, backgroundColor: Colors.background, marginBottom: 4 },
  swapSideLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  swapSideType: { fontSize: 15, fontWeight: "700", color: Colors.text },
  swapSideTime: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  swapSideDept: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  reasonBox: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginTop: 12 },
  reasonLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: "600", marginBottom: 4 },
  reasonText: { fontSize: 14, color: Colors.text },
  // SelectButton
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, backgroundColor: Colors.background,
  },
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
  sheetOptionSublabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  sheetOptionMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, fontWeight: "500" },
  sheetSeparator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },
  sheetEmpty: { paddingVertical: 32, alignItems: "center" },
  sheetEmptyText: { fontSize: 14, color: Colors.textSecondary },
  sheetCancelBtn: { margin: 16, marginTop: 8, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
})
