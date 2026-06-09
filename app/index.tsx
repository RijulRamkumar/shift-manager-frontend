// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem("accessToken").then((token) => {
      setIsLoggedIn(!!token)
    })
  }, [])

  if (isLoggedIn === null) return null // still checking storage

  if (!isLoggedIn) {
    return <Redirect href="/login" />
  }

  return <Redirect href="/(tabs)/home" />;
}
