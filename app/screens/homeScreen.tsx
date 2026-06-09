import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useEffect, useState } from "react";
import { api } from "../../api";

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);

type EmployeeType = {
  name: string;
  role: string;
  department: string;
  team: string;
  hospital: string;
  timezone: string;
};

type WeeklySummaryType = {
  hours_worked: number;
  hours_scheduled: number;
};

type ShiftType = {
  category: string;
  start?: string;
  end?: string;
};

type WeeklyShiftType = {
  date: string;
  day: string;
  category: string;
  start?: string;
  end?: string;
};

type FullRecordType = {
  employee: EmployeeType;
  weekly_summary: WeeklySummaryType;
  next_shift: ShiftType & { assigned: number; required: number } | null;
  weekly_shifts: WeeklyShiftType[];
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [fullRecord, setFullRecord] = useState<FullRecordType | null>(null);

  const fetchFullRecord = async () => {
    try {
      const response = await api.get("/full_record/");

      setFullRecord(response.data);
    } catch (error) {
      console.error("Error fetching full record:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullRecord();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="mt-2 text-gray-500">Loading Home Data...</Text>
      </View>
    );
  }

  if (!fullRecord) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-gray-500">Failed to load data.</Text>
      </View>
    );
  }

  const tz = fullRecord.employee.timezone || "UTC";
  const weekStart = dayjs().tz(tz).startOf("isoWeek").format("MMM D");
  const weekEnd = dayjs().tz(tz).endOf("isoWeek").format("MMM D");

  // Helper to format a shift with timezone
  const formatShiftTime = (start?: string, end?: string) => {
    if (!start || !end) return "—";
    return `${dayjs(start).tz(tz).format("ddd HH:mm")} – ${dayjs(
      end
    ).tz(tz).format("ddd HH:mm")}`;
  };

  // Helper to format weekly shifts
  const formatWeeklyShiftTime = (date: string, start?: string, end?: string) => {
    if (!start || !end) return "—";
  
    const startUTC = dayjs.utc(date + "T" + start);
    const endUTC = dayjs.utc(date + "T" + end);
  
    return `${startUTC.tz(tz).format("ddd HH:mm")} – ${endUTC.tz(tz).format(
      "ddd HH:mm"
    )}`;
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-5 pt-10">
        {/* Greeting */}
        <Text className="text-2xl font-bold">
          Welcome, {fullRecord.employee.name} 👋
        </Text>
        <Text className="text-gray-600">
          {fullRecord.employee.role} · {fullRecord.employee.department} ·{" "}
          {fullRecord.employee.team}
        </Text>

        {/* Next Shift */}
        <View className="mt-6 rounded-2xl bg-white p-5 shadow">
          <Text className="text-xs font-semibold text-gray-500">
            NEXT SHIFT
          </Text>

          {!fullRecord.next_shift ? (
            <>
              <Text className="mt-2 text-lg font-semibold text-gray-400">
                No shifts this week 🎉
              </Text>
              <Text className="text-gray-500 text-sm">
                You’re not scheduled for any upcoming shifts.
              </Text>
            </>
          ) : (
            <>
              <Text className="mt-2 text-lg font-semibold">
                {fullRecord.next_shift.category}
              </Text>

              <Text className="text-gray-600">
                {formatShiftTime(
                  fullRecord.next_shift.start,
                  fullRecord.next_shift.end
                )}
              </Text>

              <Text className="mt-2 text-green-600 font-medium">
                Staffing {fullRecord.next_shift.assigned}/
                {fullRecord.next_shift.required}
              </Text>
            </>
          )}
        </View>

        {/* Weekly Hours */}
        <View className="mt-6 rounded-2xl bg-white p-5 shadow">
          <Text className="text-xs font-semibold text-gray-500">
            THIS WEEK ({weekStart} – {weekEnd})
          </Text>

          <View className="mt-3 flex-row justify-between">
            <View>
              <Text className="text-xl font-bold">
                {fullRecord.weekly_summary.hours_worked}h
              </Text>
              <Text className="text-gray-600 text-sm">Worked</Text>
            </View>

            <View>
              <Text className="text-xl font-bold">
                {fullRecord.weekly_summary.hours_scheduled}h
              </Text>
              <Text className="text-gray-600 text-sm">Scheduled</Text>
            </View>
          </View>
        </View>

        {/* Weekly Schedule */}
        <View className="mt-6">
          <Text className="font-semibold text-gray-700">THIS WEEK</Text>

          {fullRecord.weekly_shifts.map((shift, i) => (
            <View
              key={i}
              className="mt-3 flex-row items-center justify-between rounded-xl bg-white p-4 shadow"
            >
              <View>
                <Text className="font-medium">{shift.day}</Text>
                <Text className="text-gray-500 text-xs">
                  {dayjs(shift.date).tz(tz).format("MMM D")}
                </Text>
              </View>

              <View className="items-end">
                <Text className="font-medium">{shift.category}</Text>

                <Text className="text-gray-600 text-sm">
                  {formatWeeklyShiftTime(shift.date, shift.start, shift.end)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}