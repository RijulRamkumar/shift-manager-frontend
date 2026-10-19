import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Pressable,
} from "react-native"
import { useCallback, useState } from "react"
import { useFocusEffect } from "expo-router"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import * as Haptics from "expo-haptics"
import { Bell, ArrowLeftRight, Calendar, Clock, Info, CheckCheck } from "lucide-react-native"
import { api } from "../../api"
import { Colors, Shadow } from "../../constants/theme"

dayjs.extend(relativeTime)

type Notification = {
  id: number
  category: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  swap:     { icon: ArrowLeftRight, color: Colors.primary,  bg: Colors.primaryLight },
  time_off: { icon: Calendar,       color: Colors.warning,  bg: Colors.warningLight },
  shift:    { icon: Clock,          color: Colors.success,  bg: Colors.successLight },
  general:  { icon: Info,           color: Colors.info,     bg: Colors.infoLight },
}

function NotificationItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const cfg = categoryConfig[item.category] ?? categoryConfig.general
  const Icon = cfg.icon
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.notifItem, !item.is_read && styles.notifUnread]}
    >
      <View style={[styles.notifIconWrap, { backgroundColor: cfg.bg }]}>
        <Icon size={18} color={cfg.color} strokeWidth={2} />
      </View>
      <View style={styles.notifBody}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        {item.body ? (
          <Text style={styles.notifBodyText} numberOfLines={2}>{item.body}</Text>
        ) : null}
        <Text style={styles.notifTime}>{dayjs(item.created_at).fromNow()}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setError(false)
    try {
      const res = await api.get("/notifications/")
      setItems(res.data.results || [])
      setUnread(res.data.unread_count || 0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { fetchNotifications() }, [fetchNotifications]))

  const markRead = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await api.post(`/notifications/${id}/read/`, {})
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnread((u) => Math.max(0, u - 1))
    } catch {}
  }

  const markAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await api.post("/notifications/read-all/", {})
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    } catch {}
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inbox</Text>
          <Text style={styles.headerSub}>
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "You're all caught up"}
          </Text>
        </View>
        {unread > 0 && (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <CheckCheck size={15} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); fetchNotifications() }}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Bell size={36} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Couldn't load notifications</Text>
            <Pressable onPress={fetchNotifications} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={36} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>We'll let you know when something happens.</Text>
          </View>
        ) : (
          <>
            {unread > 0 && (
              <Text style={styles.groupLabel}>Unread</Text>
            )}
            {items.filter((n) => !n.is_read).map((n) => (
              <NotificationItem key={n.id} item={n} onPress={() => markRead(n.id)} />
            ))}
            {items.some((n) => n.is_read) && (
              <Text style={styles.groupLabel}>Earlier</Text>
            )}
            {items.filter((n) => n.is_read).map((n) => (
              <NotificationItem key={n.id} item={n} onPress={() => {}} />
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 2 },
  markAllText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  list: { padding: 16 },
  groupLabel: { fontSize: 11, fontWeight: "700", color: Colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8, marginBottom: 8, paddingHorizontal: 4 },
  notifItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
    ...Shadow.sm,
  },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  notifIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notifTitle: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary, flex: 1 },
  notifTitleUnread: { fontWeight: "700", color: Colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8, flexShrink: 0 },
  notifBodyText: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
  emptyCard: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: "center", lineHeight: 20 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primaryLight, borderRadius: 10 },
  retryText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
})
