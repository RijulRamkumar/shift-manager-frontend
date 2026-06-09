import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { api } from "../../api";

const roleLabels: Record<string, string> = {
  admin_staff: "Admin Staff",
  doctor: "Doctor",
  nurse: "Nurse",
};

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // shared editable
  const [email, setEmail] = useState("");

  // employee-only editable
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // admin-only editable
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // employee-only read-only professional info
  const [professionalInfo, setProfessionalInfo] = useState({
    role: "",
    department: "",
    employeeId: "",
    hospital: "",
    registrationNumber: "N/A",
  });

  // admin-only professional info
  const [adminRole, setAdminRole] = useState("");
  const [adminHospitals, setAdminHospitals] = useState<string>("");

  const loadSettings = async () => {
    try {
      const res = await api.get("/settings/");
      const data = res.data;

      if (data.is_admin) {
        setIsAdmin(true);
        setAdminRole(data.role);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setEmail(data.email ?? "");
        setAdminHospitals(
          (data.hospitals ?? []).map((h: { name: string }) => h.name).join(", ") || "None assigned"
        );
      } else {
        setIsAdmin(false);
        setEmail(data.email ?? "");
        setAddress(data.address ?? "");
        setMobile(data.mobile ?? "");
        setEmergencyName(data.emergency_contact_name ?? "");
        setEmergencyPhone(data.emergency_contact_phone ?? "");
        setProfessionalInfo({
          role: data.job_title ?? "",
          department: `${data.department ?? ""} · ${data.team ?? ""}`,
          employeeId: data.employee_id ?? "",
          hospital: data.hospital ?? "",
          registrationNumber: data.licence_number ?? "N/A",
        });
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      if (isAdmin) {
        await api.patch("/settings/", { first_name: firstName, last_name: lastName, email });
      } else {
        await api.patch("/settings/", {
          email,
          address,
          mobile,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
        });
      }
      Alert.alert("Saved", "Your settings have been updated.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save settings");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-5 pt-10">
        {/* Header */}
        <Text className="text-2xl font-bold">Settings</Text>
        <Text className="text-gray-600">
          Manage your profile and personal information
        </Text>

        {/* PROFESSIONAL INFO */}
        <View className="mt-6 rounded-2xl bg-white p-5 shadow">
          <Text className="text-xs font-semibold text-gray-500 mb-3">
            PROFESSIONAL INFORMATION
          </Text>

          {isAdmin ? (
            <>
             <InfoRow label="Role" value={roleLabels[adminRole] || adminRole} />
              <InfoRow label="Assigned Hospital(s)" value={adminHospitals} />
            </>
          ) : (
            <>
              <InfoRow label="Job Title / Role" value={professionalInfo.role} />
              <InfoRow label="Department / Team" value={professionalInfo.department} />
              <InfoRow label="Employee ID" value={professionalInfo.employeeId} />
              <InfoRow label="Registration ID" value={professionalInfo.registrationNumber} />
              <InfoRow label="Assigned Hospital" value={professionalInfo.hospital} />
            </>
          )}
        </View>

        {/* ADMIN: Name fields */}
        {isAdmin && (
          <View className="mt-6 rounded-2xl bg-white p-5 shadow">
            <Text className="text-xs font-semibold text-gray-500 mb-3">
              PERSONAL DETAILS
            </Text>

            <Field label="First Name">
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                placeholder="Enter first name"
              />
            </Field>

            <Field label="Last Name">
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                placeholder="Enter last name"
              />
            </Field>

            <Field label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                placeholder="Enter email"
              />
            </Field>
          </View>
        )}

        {/* EMPLOYEE: Contact details */}
        {!isAdmin && (
          <>
            <View className="mt-6 rounded-2xl bg-white p-5 shadow">
              <Text className="text-xs font-semibold text-gray-500 mb-3">
                CONTACT DETAILS
              </Text>

              <Field label="Email">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                  placeholder="Enter email"
                />
              </Field>

              <Field label="Personal Address">
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                  placeholder="Enter address"
                />
              </Field>

              <Field label="Contact Mobile">
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                  placeholder="Enter mobile number"
                />
              </Field>
            </View>

            <View className="mt-6 rounded-2xl bg-white p-5 shadow">
              <Text className="text-xs font-semibold text-gray-500 mb-3">
                EMERGENCY CONTACT
              </Text>

              <Field label="Contact Name">
                <TextInput
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                  placeholder="Enter contact name"
                />
              </Field>

              <Field label="Contact Phone Number">
                <TextInput
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                  className="rounded-xl border border-gray-200 px-4 py-3 text-base"
                  placeholder="Enter phone number"
                />
              </Field>
            </View>
          </>
        )}

        {/* SAVE */}
        <TouchableOpacity
          onPress={handleSave}
          className="mt-8 mb-10 rounded-2xl bg-indigo-600 py-4 items-center shadow"
        >
          <Text className="text-white font-semibold text-base">
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3">
      <Text className="text-gray-500 text-xs">{label}</Text>
      <Text className="text-base font-medium">{value}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-gray-500 text-xs mb-1">{label}</Text>
      {children}
    </View>
  );
}
