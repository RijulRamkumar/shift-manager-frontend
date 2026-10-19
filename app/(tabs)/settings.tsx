import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet, Pressable,
} from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import * as Haptics from "expo-haptics"
import { ChevronRight, LogOut, Lock, Building2, Stethoscope, Phone, MapPin, UserRound, ShieldCheck } from "lucide-react-native"
import { api, logout } from "../../api"
import { Colors, Shadow } from "../../constants/theme"

const roleLabels: Record<string, string> = {
  admin_staff: "Admin Staff",
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [mobile, setMobile] = useState("")
  const [emergencyName, setEmergencyName] = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [professionalInfo, setProfessionalInfo] = useState({
    role: "", department: "", employeeId: "", hospital: "", registrationNumber: "N/A",
  })
  const [adminRole, setAdminRole] = useState("")
  const [adminHospitals, setAdminHospitals] = useState("")

  const loadSettings = async () => {
    try {
      const res = await api.get("/settings/")
      const data = res.data
      if (data.is_admin) {
        setIsAdmin(true)
        setAdminRole(data.role)
        setFirstName(data.first_name ?? "")
        setLastName(data.last_name ?? "")
        setEmail(data.email ?? "")
        const hospitals: { name: string; timezone?: string }[] = data.hospitals ?? []
        setAdminHospitals(hospitals.map((h) => h.name).join(", ") || "None assigned")
        if (hospitals[0]?.timezone) {
          AsyncStorage.setItem("hospitalTimezone", hospitals[0].timezone)
        }
      } else {
        setIsAdmin(false)
        setEmail(data.email ?? "")
        setAddress(data.address ?? "")
        setMobile(data.mobile ?? "")
        setEmergencyName(data.emergency_contact_name ?? "")
        setEmergencyPhone(data.emergency_contact_phone ?? "")
        setProfessionalInfo({
          role: data.job_title ?? "",
          department: `${data.department ?? ""} · ${data.team ?? ""}`,
          employeeId: data.employee_id ?? "",
          hospital: data.hospital ?? "",
          registrationNumber: data.licence_number ?? "N/A",
        })
      }
    } catch {
      Alert.alert("Error", "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isAdmin) {
        await api.patch("/settings/", { first_name: firstName, last_name: lastName, email })
      } else {
        await api.patch("/settings/", { email, address, mobile, emergency_contact_name: emergencyName, emergency_contact_phone: emergencyPhone })
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Saved", "Your profile has been updated.")
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert("Error", "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const displayName = isAdmin ? `${firstName} ${lastName}`.trim() : professionalInfo.role
  const initials = isAdmin
    ? `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
    : (firstName[0] ?? email[0] ?? "U").toUpperCase()

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials || email[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{displayName || email}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <View style={styles.rolePill}>
            {isAdmin
              ? <ShieldCheck size={13} color={Colors.primary} strokeWidth={2} />
              : <Stethoscope size={13} color={Colors.success} strokeWidth={2} />}
            <Text style={[styles.rolePillText, { color: isAdmin ? Colors.primary : Colors.success }]}>
              {roleLabels[adminRole] || adminRole || professionalInfo.role}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Professional info (read-only) */}
          <SectionLabel title="Professional Info" />
          <View style={styles.infoCard}>
            {isAdmin ? (
              <>
                <InfoRow icon={<ShieldCheck size={16} color={Colors.textSecondary} />} label="Role" value={roleLabels[adminRole] || adminRole} />
                <InfoRow icon={<Building2 size={16} color={Colors.textSecondary} />} label="Assigned Hospitals" value={adminHospitals} last />
              </>
            ) : (
              <>
                <InfoRow icon={<Stethoscope size={16} color={Colors.textSecondary} />} label="Job Title" value={professionalInfo.role} />
                <InfoRow icon={<Building2 size={16} color={Colors.textSecondary} />} label="Department / Team" value={professionalInfo.department} />
                <InfoRow icon={<UserRound size={16} color={Colors.textSecondary} />} label="Employee ID" value={professionalInfo.employeeId} />
                <InfoRow icon={<Building2 size={16} color={Colors.textSecondary} />} label="Hospital" value={professionalInfo.hospital} last />
              </>
            )}
          </View>

          {/* Editable fields */}
          {isAdmin ? (
            <>
              <SectionLabel title="Personal Details" />
              <View style={styles.fieldsCard}>
                <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
                <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" />
                <Field label="Email" value={email} onChange={setEmail} placeholder="Email address" keyboard="email-address" last />
              </View>
            </>
          ) : (
            <>
              <SectionLabel title="Contact Details" />
              <View style={styles.fieldsCard}>
                <Field label="Email" value={email} onChange={setEmail} placeholder="Email address" keyboard="email-address" />
                <Field label="Mobile" value={mobile} onChange={setMobile} placeholder="Mobile number" keyboard="phone-pad" icon={<Phone size={15} color={Colors.textTertiary} />} />
                <Field label="Address" value={address} onChange={setAddress} placeholder="Home address" icon={<MapPin size={15} color={Colors.textTertiary} />} multiline last />
              </View>

              <SectionLabel title="Emergency Contact" />
              <View style={styles.fieldsCard}>
                <Field label="Contact Name" value={emergencyName} onChange={setEmergencyName} placeholder="Full name" />
                <Field label="Contact Phone" value={emergencyPhone} onChange={setEmergencyPhone} placeholder="Phone number" keyboard="phone-pad" icon={<Phone size={15} color={Colors.textTertiary} />} last />
              </View>
            </>
          )}

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={styles.saveBtn}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>

          {/* Account actions */}
          <SectionLabel title="Account" />
          <View style={styles.actionsCard}>
            <TouchableOpacity
              onPress={() => router.push("/change-password")}
              style={styles.actionRow}
            >
              <Lock size={18} color={Colors.text} strokeWidth={1.5} />
              <Text style={styles.actionText}>Change Password</Text>
              <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Log Out", "Are you sure you want to log out?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Log Out", style: "destructive", onPress: () => logout() },
                ])
              }
              style={styles.actionRow}
            >
              <LogOut size={18} color={Colors.error} strokeWidth={1.5} />
              <Text style={[styles.actionText, { color: Colors.error }]}>Log Out</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
  )
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoRowIcon}>{icon}</View>
      <View style={styles.infoRowBody}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value || "—"}</Text>
      </View>
    </View>
  )
}

function Field({
  label, value, onChange, placeholder, keyboard, icon, multiline, last,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; keyboard?: any; icon?: React.ReactNode; multiline?: boolean; last?: boolean
}) {
  return (
    <View style={[styles.fieldWrap, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        {icon}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={keyboard ?? "default"}
          autoCapitalize="none"
          multiline={multiline}
          style={[styles.fieldInput, icon && { marginLeft: 6 }]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileHeader: {
    backgroundColor: Colors.primary, paddingTop: 60, paddingBottom: 28,
    alignItems: "center", paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center",
    marginBottom: 12, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  profileName: { fontSize: 20, fontWeight: "700", color: "#fff", letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 3 },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  rolePillText: { fontSize: 12, fontWeight: "600" },
  content: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: Colors.textTertiary, letterSpacing: 0.8, marginBottom: 8, marginTop: 20, paddingHorizontal: 4 },
  infoCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", ...Shadow.sm },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoRowIcon: { width: 32, alignItems: "center" },
  infoRowBody: { flex: 1 },
  infoRowLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: "500", marginBottom: 2 },
  infoRowValue: { fontSize: 14, fontWeight: "600", color: Colors.text },
  fieldsCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", ...Shadow.sm },
  fieldWrap: { padding: 14 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: "500", marginBottom: 4 },
  fieldInputRow: { flexDirection: "row", alignItems: "center" },
  fieldInput: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 2 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 24, ...Shadow.sm },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionsCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", ...Shadow.sm },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  actionText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: "500" },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
})
