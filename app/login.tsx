import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import { useState } from "react"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import { Eye, EyeOff, Mail, Lock } from "lucide-react-native"
import { api } from "../api"
import { Colors, Shadow } from "../constants/theme"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await api.post("/auth/login/", { email, password })
      const { access, refresh, user } = res.data
      await AsyncStorage.setItem("accessToken", access)
      await AsyncStorage.setItem("refreshToken", refresh)
      await AsyncStorage.setItem("userRole", user.role)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace("/home")
    } catch {
      setError("Invalid email or password")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.gradient}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.brandArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>+</Text>
            </View>
            <Text style={styles.appName}>ShiftCare</Text>
            <Text style={styles.appTagline}>Hospital Scheduling</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputRow, error && styles.inputError]}>
                <Mail size={18} color={Colors.textTertiary} strokeWidth={1.5} />
                <TextInput
                  style={styles.input}
                  placeholder="you@hospital.com"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError("") }}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, error && styles.inputError]}>
                <Lock size={18} color={Colors.textTertiary} strokeWidth={1.5} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError("") }}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  {showPassword
                    ? <EyeOff size={18} color={Colors.textTertiary} strokeWidth={1.5} />
                    : <Eye size={18} color={Colors.textTertiary} strokeWidth={1.5} />}
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.loginBtn}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandArea: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { fontSize: 36, color: "#fff", fontWeight: "700", lineHeight: 42 },
  appName: { fontSize: 28, fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
  appTagline: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    ...Shadow.md,
  },
  cardTitle: { fontSize: 22, fontWeight: "700", color: Colors.text, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  errorText: { fontSize: 13, color: Colors.error, marginBottom: 12, marginTop: -4 },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    ...Shadow.sm,
  },
  loginBtnPressed: { opacity: 0.85 },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  forgotBtn: { marginTop: 16, alignItems: "center" },
  forgotText: { color: Colors.primary, fontSize: 14, fontWeight: "500" },
})
