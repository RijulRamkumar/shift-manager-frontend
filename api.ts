import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import Constants from "expo-constants"
import { router } from "expo-router"
import { Platform } from "react-native"

function getBaseUrl(): string {
  if (Platform.OS === "web") {
    return "http://localhost:8000"
  }
  // For Expo Go on a physical device, derive the host from the Metro bundler URI
  // so it stays correct even when the machine's IP changes
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const host = hostUri.split(":")[0]
    return `http://${host}:8000`
  }
  return "http://192.168.0.132:8000"
}

// const BASE_URL = getBaseUrl()
const BASE_URL = "http://192.168.0.132:8000";

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // only attempt refresh for endpoints other than /auth/login
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login/")
    ) {
      originalRequest._retry = true;
      const refresh = await AsyncStorage.getItem("refreshToken");

      try {
        const res = await axios.post(
          `${BASE_URL}/auth/refresh/`,
          { refresh }
        );

        await AsyncStorage.setItem("accessToken", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return api.request(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove(["accessToken", "refreshToken", "userRole"])
        router.replace("/login")
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);