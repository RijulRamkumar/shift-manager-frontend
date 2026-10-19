import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native"
import { router } from "expo-router"
import { useState } from "react"
import { api } from "../api"

// Two-step reset: request a token (emailed; surfaced directly in DEBUG), then
// confirm with the uid/token + new password.
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<"request" | "confirm">("request")
  const [email, setEmail] = useState("")
  const [uid, setUid] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRequest = async () => {
    setError("")
    setLoading(true)
    try {
      const res = await api.post("/auth/password-reset/", { email })
      // In DEBUG the backend returns uid/token so the flow is testable.
      if (res.data?.uid && res.data?.token) {
        setUid(res.data.uid)
        setToken(res.data.token)
      }
      setStep("confirm")
      Alert.alert(
        "Check your email",
        "If that email exists, we've sent reset instructions. Enter the code below."
      )
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setError("")
    setLoading(true)
    try {
      await api.post("/auth/password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
      })
      Alert.alert("Success", "Password reset. You can now sign in.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ])
    } catch (err: any) {
      const data = err?.response?.data
      setError(data?.error || data?.new_password?.[0] || "Could not reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-gray-100 justify-center px-5">
      <View className="mb-6">
        <Text className="text-2xl font-bold">Reset Password</Text>
        <Text className="text-gray-600 mt-1">
          {step === "request"
            ? "Enter your email to receive a reset code"
            : "Enter the code from your email and a new password"}
        </Text>
      </View>

      <View className="rounded-2xl bg-white p-5 shadow">
        {step === "request" ? (
          <>
            <Text className="text-xs font-semibold text-gray-500 mb-1">EMAIL</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder="you@hospital.org"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </>
        ) : (
          <>
            <Text className="text-xs font-semibold text-gray-500 mb-1">UID</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder="From email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              value={uid}
              onChangeText={setUid}
            />
            <Text className="text-xs font-semibold text-gray-500 mb-1">TOKEN</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder="From email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              value={token}
              onChangeText={setToken}
            />
            <Text className="text-xs font-semibold text-gray-500 mb-1">NEW PASSWORD</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </>
        )}

        {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}

        <Pressable
          onPress={step === "request" ? handleRequest : handleConfirm}
          disabled={loading}
          className="mt-2 rounded-xl bg-black py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">
              {step === "request" ? "Send Reset Code" : "Reset Password"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace("/login")} className="mt-3 py-2">
          <Text className="text-center text-gray-500">Back to sign in</Text>
        </Pressable>
      </View>
    </View>
  )
}
