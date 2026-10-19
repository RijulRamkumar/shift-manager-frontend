import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native"
import { router } from "expo-router"
import { useState } from "react"
import { api } from "../api"

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError("")
    if (next !== confirm) {
      setError("New passwords do not match.")
      return
    }
    setLoading(true)
    try {
      await api.post("/auth/change-password/", {
        current_password: current,
        new_password: next,
      })
      Alert.alert("Success", "Your password has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ])
    } catch (err: any) {
      const data = err?.response?.data
      setError(
        data?.current_password?.[0] ||
          data?.new_password?.[0] ||
          "Could not change password."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-gray-100 justify-center px-5">
      <View className="mb-6">
        <Text className="text-2xl font-bold">Change Password</Text>
        <Text className="text-gray-600 mt-1">Enter your current and new password</Text>
      </View>

      <View className="rounded-2xl bg-white p-5 shadow">
        <Text className="text-xs font-semibold text-gray-500 mb-1">CURRENT PASSWORD</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={current}
          onChangeText={setCurrent}
        />

        <Text className="text-xs font-semibold text-gray-500 mb-1">NEW PASSWORD</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={next}
          onChangeText={setNext}
        />

        <Text className="text-xs font-semibold text-gray-500 mb-1">CONFIRM NEW PASSWORD</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className="mt-2 rounded-xl bg-indigo-600 py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">Update Password</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} className="mt-3 py-2">
          <Text className="text-center text-gray-500">Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}
