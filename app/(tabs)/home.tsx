import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "../screens/homeScreen";
import AdminHomeScreen from "../screens/adminHomeScreen";

type UserRole = "employee" | "admin" | "admin_staff";

export default function HomeRouter() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  const loadUserRole = async () => {
    const stored = await AsyncStorage.getItem("userRole");
    
    // Cast to UserRole only if valid, else null
    const role: UserRole | null =
      stored === "employee" || stored === "admin_staff" || stored === "admin" ? stored : null;

    setRole(role);
    setLoading(false);
  };

  useEffect(() => {
    loadUserRole();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  return role === "admin" || role === "admin_staff" ? <AdminHomeScreen /> : <HomeScreen />;
}