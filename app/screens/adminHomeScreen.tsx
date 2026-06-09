import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { api } from "../../api";

type DashboardData = {
  total_employees: number;
  on_shift_now: number;
  pending_time_off: number;
  pending_swaps: number;
  staffing_alerts: { department: string; shift: string; assigned: number; required: number }[];
  employees_per_team: { department: string; team: string; employees_on_shift: number }[];
};

export default function AdminHomeScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const getAdminDashboardData = async () => {
    try {
      const response = await api.get("api/admin/dashboard/");
      console.log("Admin dashboard data:", response.data);
      setData(response.data);
    } catch (error) {
      console.error("Failed to load admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAdminDashboardData();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-5 pt-10">

        {/* Header */}
        <Text className="text-2xl font-bold">Admin Dashboard</Text>
        <Text className="text-gray-600">
          Manage staff and hospital scheduling
        </Text>

        {/* Summary */}
        <View className="mt-6 rounded-2xl bg-white p-5 shadow">
          <Text className="text-xs font-semibold text-gray-500">
            TODAY'S SUMMARY
          </Text>

          <View className="mt-4 flex-row justify-between">
            <SummaryStat label="Employees" value={data?.total_employees ?? 0} />
            <SummaryStat label="On Shift" value={data?.on_shift_now ?? 0} />
            <SummaryStat label="Leave Pending" value={data?.pending_time_off ?? 0} />
            <SummaryStat label="Swap Pending" value={data?.pending_swaps ?? 0} />
          </View>
        </View>

        {/* Staffing Alerts */}
        <View className="mt-6 rounded-2xl bg-white p-5 shadow">
          <Text className="text-xs font-semibold text-gray-500 mb-3">
            STAFFING ALERTS
          </Text>

          {!data?.staffing_alerts?.length ? (
            <Text className="text-gray-500 text-sm">
              No staffing issues today.
            </Text>
          ) : (
            data.staffing_alerts.map((alert, i) => (
              <View
                key={i}
                className="flex-row justify-between items-center mb-3"
              >
                <View>
                  <Text className="font-medium">{alert.department}</Text>
                  <Text className="text-gray-500 text-xs">{alert.shift}</Text>
                </View>

                <Text className="text-red-500 font-medium">
                  {alert.assigned}/{alert.required}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Employees Per Team */}
        <View className="mt-6">
          <Text className="font-semibold text-gray-700">
            EMPLOYEES WORKING PER TEAM
          </Text>

          {!data?.employees_per_team?.length ? (
            <View className="mt-3 rounded-xl bg-white p-4 shadow">
              <Text className="text-gray-500 text-sm">No employees currently on shift.</Text>
            </View>
          ) : (
            data.employees_per_team.map((team, i) => (
              <View
                key={i}
                className="mt-3 flex-row justify-between rounded-xl bg-white p-4 shadow"
              >
                <View>
                  <Text className="font-medium">{team.department}</Text>
                  <Text className="text-gray-500 text-xs">{team.team}</Text>
                </View>

                <Text className="text-gray-600 text-sm">
                  {team.employees_on_shift} on shift
                </Text>
              </View>
            ))
          )}
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <Text className="text-xl font-bold">{value}</Text>
      <Text className="text-gray-600 text-xs text-center">{label}</Text>
    </View>
  );
}