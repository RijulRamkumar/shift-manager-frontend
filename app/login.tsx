import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import { useState } from "react"
import { api } from "../api"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError("")
    setLoading(true)

    try {
      
      const res = await api.post("/auth/login/", {
        email: email,
        password,
      })

      const { access, refresh, user } = res.data;
      
      await AsyncStorage.setItem("accessToken", access);
      await AsyncStorage.setItem("refreshToken", refresh);
      await AsyncStorage.setItem("userRole", user.role);

      router.replace("/home");
    } catch(error) {
      console.log(error);
      
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-100 justify-center px-5">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold">
          Sign in
        </Text>
        <Text className="text-gray-600 mt-1">
          Access your weekly schedule and shifts
        </Text>
      </View>

      {/* Login Card */}
      <View className="rounded-2xl bg-white p-5 shadow">
        <Text className="text-xs font-semibold text-gray-500 mb-1">
          Email
        </Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          placeholder="Enter your email"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text className="text-xs font-semibold text-gray-500 mb-1">
          PASSWORD
        </Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <Text className="text-red-500 text-sm mb-3">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="mt-2 rounded-xl bg-black py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">
              Login
            </Text>
          )}
        </Pressable>
      </View>

      {/* Footer */}
      <Text className="mt-6 text-center text-gray-500 text-sm">
        Hospital Scheduling System
      </Text>
    </View>
  )
}