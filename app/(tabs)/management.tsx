import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, TextInput } from "react-native";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../../api";

interface Shift {
  id: number;
  start: string;
  end: string;
  shift_type: string;
  department_name: string;
}

interface ShiftAssignment {
  id: number;
  shift: Shift;
}

interface TimeOffRequest {
  id: number;
  employee_name: string;
  time_off_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string;
  approved_by_name?: string;
}

interface ShiftSwapRequest {
  id: number;
  requester_name: string;
  target_name: string;
  status: string;
  reason?: string;
  requester_shift_info: {
    shift_type: string;
    start: string;
    end: string;
    department: string;
  };
  target_shift_info: {
    shift_type: string;
    start: string;
    end: string;
    department: string;
  };
}

export default function ManagementScreen() {
  const [userRole, setUserRole] = useState<string>("");

  // Modals
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSwapDetailModal, setShowSwapDetailModal] = useState(false);
  const [selectedSwapDetail, setSelectedSwapDetail] = useState<ShiftSwapRequest | null>(null);

  // Data states
  const [userShifts, setUserShifts] = useState<ShiftAssignment[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [outgoingSwapRequests, setOutgoingSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [incomingSwapRequests, setIncomingSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [allSwapRequests, setAllSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [targetShifts, setTargetShifts] = useState<ShiftAssignment[]>([]);

  // Form states
  const [selectedMyShiftAssignment, setSelectedMyShiftAssignment] = useState<string | null>(null);
  const [selectedTargetShiftAssignment, setSelectedTargetShiftAssignment] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState("");
  const [showMyShiftPicker, setShowMyShiftPicker] = useState(false);

  // Time off form
  const [timeOffType, setTimeOffType] = useState("annual_leave");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [timeOffReason, setTimeOffReason] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingSwaps, setLoadingSwaps] = useState(false);

  // Get user role from storage
  useEffect(() => {
    AsyncStorage.getItem("userRole").then((role) => {
      if (role) setUserRole(role);
    });
  }, []);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [shiftsRes, timeOffRes, swapsRes] = await Promise.all([
        api.get("/shifts/"),
        api.get("/time-off-requests/"),
        api.get("/shifts/swap-requests/"),
      ]);

      setUserShifts(shiftsRes.data || []);
      setTimeOffRequests(timeOffRes.data || []);

      if (userRole && ["admin", "admin_staff"].includes(userRole)) {
        setAllSwapRequests(swapsRes.data.incoming || []);
      } else {
        setOutgoingSwapRequests(swapsRes.data.outgoing || []);
        setIncomingSwapRequests(swapsRes.data.incoming || []);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch target shifts for swap
  useEffect(() => {
    const fetchAvailableShifts = async () => {
      try {
        const res = await api.get("/shifts/available/");
        setTargetShifts(res.data || []);
      } catch (err) {
        console.error("Failed to fetch available shifts", err);
      }
    };
    fetchAvailableShifts();
  }, []);

  const handleCreateSwap = async () => {
    if (!selectedMyShiftAssignment || !selectedTargetShiftAssignment) {
      Alert.alert("Error", "Please select both shifts");
      return;
    }

    try {
      setLoadingSwaps(true);
      await api.post("/shifts/swap-request/", {
        requester_assignment_id: selectedMyShiftAssignment,
        target_assignment_id: selectedTargetShiftAssignment,
        reason: swapReason,
      });

      Alert.alert("Success", "Shift swap request created");
      setShowSwapModal(false);
      setSelectedMyShiftAssignment(null);
      setSelectedTargetShiftAssignment(null);
      setSwapReason("");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create swap request");
    } finally {
      setLoadingSwaps(false);
    }
  };

  const handleCreateTimeOff = async () => {
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select both dates");
      return;
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    try {
      setLoading(true);
      await api.post("/time-off-requests/create/", {
        time_off_type: timeOffType,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        reason: timeOffReason,
      });

      Alert.alert("Success", "Time off request submitted for approval");
      setShowTimeOffModal(false);
      setStartDate(null);
      setEndDate(null);
      setTimeOffReason("");
      setTimeOffType("annual_leave");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create time off request");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSwap = async (id: number) => {
    try {
      setLoadingSwaps(true);
      await api.post(`/shifts/swap-requests/${id}/approve/`, {});
      Alert.alert("Success", "Swap request approved");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to approve swap request");
    } finally {
      setLoadingSwaps(false);
    }
  };

  const handleRejectSwap = async (id: number) => {
    try {
      setLoadingSwaps(true);
      await api.post(`/shifts/swap-requests/${id}/reject-approval/`, {});
      Alert.alert("Success", "Swap request rejected");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to reject swap request");
    } finally {
      setLoadingSwaps(false);
    }
  };

  const handleAcceptSwap = async (id: number) => {
    try {
      setLoadingSwaps(true);
      await api.post(`/shifts/swap-requests/${id}/accept/`, {});
      Alert.alert("Success", "Swap request accepted");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to accept swap request");
    } finally {
      setLoadingSwaps(false);
    }
  };

  const handleApproveTimeOff = async (id: number) => {
    try {
      setLoading(true);
      await api.post(`/time-off-requests/${id}/approve/`, {});
      Alert.alert("Success", "Time off request approved");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to approve time off request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTimeOff = async (id: number) => {
    try {
      setLoading(true);
      await api.post(`/time-off-requests/${id}/reject/`, {});
      Alert.alert("Success", "Time off request rejected");
      fetchAllData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to reject time off request");
    } finally {
      setLoading(false);
    }
  };

   const isAdmin = ["admin", "admin_staff"].includes(userRole);

  const formatShift = (assignment?: ShiftAssignment | null) => {
    if (!assignment) return "";
    return `${assignment.shift.shift_type} (${new Date(assignment.shift.start).toLocaleTimeString()} - ${new Date(assignment.shift.end).toLocaleTimeString()})`;
  };

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
        <Text className="text-2xl font-bold">Shift Management</Text>
        <Text className="text-gray-600 mb-6">Manage time off and shift swaps</Text>

        {/* Time Off Requests */}
        <View className="rounded-2xl bg-white p-5 shadow">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-semibold text-gray-500">TIME OFF REQUESTS</Text>
            {isAdmin && <Text className="text-xs bg-indigo-100 px-2 py-1 rounded text-indigo-700">Admin</Text>}
          </View>

          {timeOffRequests.length === 0 ? (
            <Text className="text-gray-500 text-sm mb-4">No time off requests</Text>
          ) : (
            timeOffRequests.map((req) => (
              <TimeOffRequestCard
                key={req.id}
                request={req}
                isAdmin={isAdmin}
                onApprove={() => handleApproveTimeOff(req.id)}
                onReject={() => handleRejectTimeOff(req.id)}
              />
            ))
          )}

          {!isAdmin && (
            <TouchableOpacity
              className="mt-4 rounded-xl bg-indigo-600 py-3 items-center"
              onPress={() => setShowTimeOffModal(true)}
            >
              <Text className="text-white font-semibold">Request Time Off</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Shift Swap Requests */}
        <View className="mt-6 rounded-2xl bg-white p-5 shadow mb-10">
          <Text className="text-xs font-semibold text-gray-500 mb-3">SHIFT SWAP REQUESTS</Text>

          {!isAdmin ? (
            <>
              <Text className="font-medium text-gray-700 mb-2">Your Requests</Text>
              {outgoingSwapRequests.length === 0 ? (
                <Text className="text-gray-500 text-sm mb-4">No outgoing requests</Text>
              ) : (
                outgoingSwapRequests.map((req) => (
                  <ShiftSwapCard
                    key={req.id}
                    request={req}
                    type="outgoing"
                    onPress={() => {
                      setSelectedSwapDetail(req);
                      setShowSwapDetailModal(true);
                    }}
                  />
                ))
              )}

              <View className="mt-4 border-t border-gray-200 pt-4" />
              <Text className="font-medium text-gray-700 mb-2">Requests For You</Text>
              {incomingSwapRequests.length === 0 ? (
                <Text className="text-gray-500 text-sm mb-4">No incoming requests</Text>
              ) : (
                incomingSwapRequests.map((req) => (
                  <ShiftSwapCard
                    key={req.id}
                    request={req}
                    type="incoming"
                    onAccept={() => handleAcceptSwap(req.id)}
                    onReject={() => {
                      Alert.alert(
                        "Reject Request",
                        "Are you sure you want to reject this swap request?",
                        [
                          { text: "Cancel", onPress: () => {} },
                          {
                            text: "Reject",
                            onPress: async () => {
                              try {
                                await api.post(`/shifts/swap-requests/${req.id}/reject/`, {});
                                Alert.alert("Success", "Request rejected");
                                fetchAllData();
                              } catch (err) {
                                Alert.alert("Error", "Failed to reject request");
                              }
                            },
                          },
                        ]
                      );
                    }}
                    onPress={() => {
                      setSelectedSwapDetail(req);
                      setShowSwapDetailModal(true);
                    }}
                  />
                ))
              )}
            </>
          ) : (
            <>
              <Text className="font-medium text-gray-700 mb-2">Pending Approvals</Text>
              {allSwapRequests.filter((r) => r.status === "accepted").length === 0 ? (
                <Text className="text-gray-500 text-sm mb-4">No pending approvals</Text>
              ) : (
                allSwapRequests
                  .filter((r) => r.status === "accepted")
                  .map((req) => (
                    <AdminSwapCard
                      key={req.id}
                      request={req}
                      onApprove={() => handleApproveSwap(req.id)}
                      onReject={() => handleRejectSwap(req.id)}
                      onPress={() => {
                        setSelectedSwapDetail(req);
                        setShowSwapDetailModal(true);
                      }}
                    />
                  ))
              )}
            </>
          )}

          {!isAdmin && (
            <TouchableOpacity
              className="mt-4 rounded-xl bg-indigo-600 py-3 items-center"
              onPress={() => setShowSwapModal(true)}
            >
              <Text className="text-white font-semibold">Request Shift Swap</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Time Off Modal */}
      <Modal visible={showTimeOffModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Request Time Off</Text>
              <TouchableOpacity onPress={() => setShowTimeOffModal(false)}>
                <Text className="text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            {/* Time Off Type */}
            <Text className="text-sm text-gray-500 mb-1">Type</Text>
            <View className="border border-gray-300 rounded mb-3">
              <Picker
                selectedValue={timeOffType}
                onValueChange={setTimeOffType}
              >
                <Picker.Item label="Annual Leave" value="annual_leave" />
                <Picker.Item label="Personal Leave" value="personal_leave" />
                <Picker.Item label="Sick Leave" value="sick_leave" />
                <Picker.Item label="Unpaid Leave" value="unpaid_leave" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>

            {/* Start Date */}
            <Text className="text-sm text-gray-500 mb-1">Start Date</Text>
            <TouchableOpacity
              onPress={() => setShowStartDatePicker(true)}
              className="border border-gray-300 rounded px-3 py-3 mb-3 bg-blue-50"
            >
              <Text className="text-base text-gray-800 font-medium">
                {startDate ? startDate.toLocaleDateString() : "Select start date"}
              </Text>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}

            {/* End Date */}
            <Text className="text-sm text-gray-500 mb-1">End Date</Text>
            <TouchableOpacity
              onPress={() => setShowEndDatePicker(true)}
              className="border border-gray-300 rounded px-3 py-3 mb-3 bg-green-50"
            >
              <Text className="text-base text-gray-800 font-medium">
                {endDate ? endDate.toLocaleDateString() : "Select end date"}
              </Text>
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}

            {/* Reason */}
            <Text className="text-sm text-gray-500 mb-1">Reason (Optional)</Text>
            <TextInput
              placeholder="Enter reason (optional)..."
              placeholderTextColor="#999"
              value={timeOffReason}
              onChangeText={setTimeOffReason}
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded px-3 py-2 mb-4"
            />

            {/* Actions */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-lg py-3 items-center"
                onPress={() => setShowTimeOffModal(false)}
              >
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-indigo-600 rounded-lg py-3 items-center"
                onPress={handleCreateTimeOff}
                disabled={loading}
              >
                <Text className="font-semibold text-white">
                  {loading ? "Creating..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shift Swap Modal */}
      <Modal visible={showSwapModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Request Shift Swap</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)}>
                <Text className="text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            {/* My Shift */}
            <Text className="text-sm text-gray-500 mb-1">Your Shift</Text>
            <View className="border border-gray-300 rounded mb-3">
              <TouchableOpacity
                className="border border-gray-300 rounded px-3 py-3 mb-3"
                onPress={() => setShowMyShiftPicker(true)}
              >
                <Text>
                  {selectedMyShiftAssignment
                    ? formatShift(
                        userShifts.find(s => s.id.toString() === selectedMyShiftAssignment)
                      )
                    : "Select your shift"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Target Shift */}
            <Text className="text-sm text-gray-500 mb-1">Target Shift</Text>
            <View className="border border-gray-300 rounded mb-3">
              <Picker
                selectedValue={selectedTargetShiftAssignment}
                onValueChange={setSelectedTargetShiftAssignment}
              >
                <Picker.Item label="Select target shift" value={null} />
                {targetShifts.map((assignment: any) => (
                  <Picker.Item
                    key={assignment.id}
                    label={`${assignment.shift?.shift_type || "Shift"} - ${assignment.shift?.start}`}
                    value={assignment.id.toString()}
                  />
                ))}
              </Picker>
            </View>

            {/* Reason */}
            <Text className="text-sm text-gray-500 mb-1">Reason (Optional)</Text>
            <TextInput
              placeholder="Enter reason (optional)..."
              placeholderTextColor="#999"
              value={swapReason}
              onChangeText={setSwapReason}
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded px-3 py-2 mb-4"
            />

            {/* Actions */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-lg py-3 items-center"
                onPress={() => setShowSwapModal(false)}
              >
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-indigo-600 rounded-lg py-3 items-center"
                onPress={handleCreateSwap}
                disabled={loadingSwaps}
              >
                <Text className="font-semibold text-white">
                  {loadingSwaps ? "Creating..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Swap Detail Modal */}
      <Modal visible={showSwapDetailModal} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/50 px-5">
          <View className="bg-white rounded-xl p-5">
            {selectedSwapDetail && (
              <>
                <Text className="text-lg font-bold mb-4">Shift Swap Details</Text>

                <View className="mb-4">
                  <Text className="text-sm text-gray-600 mb-2">From: {selectedSwapDetail.requester_name}</Text>
                  <View className="bg-blue-50 p-3 rounded">
                    <Text className="font-semibold text-blue-900">
                      {selectedSwapDetail.requester_shift_info.shift_type}
                    </Text>
                    <Text className="text-sm text-blue-800">
                      {new Date(selectedSwapDetail.requester_shift_info.start).toLocaleString()}
                    </Text>
                    <Text className="text-xs text-blue-700">
                      {selectedSwapDetail.requester_shift_info.department}
                    </Text>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-600 mb-2">To: {selectedSwapDetail.target_name}</Text>
                  <View className="bg-green-50 p-3 rounded">
                    <Text className="font-semibold text-green-900">
                      {selectedSwapDetail.target_shift_info.shift_type}
                    </Text>
                    <Text className="text-sm text-green-800">
                      {new Date(selectedSwapDetail.target_shift_info.start).toLocaleString()}
                    </Text>
                    <Text className="text-xs text-green-700">
                      {selectedSwapDetail.target_shift_info.department}
                    </Text>
                  </View>
                </View>

                {selectedSwapDetail.reason && (
                  <View className="mb-4 p-3 bg-gray-100 rounded">
                    <Text className="text-xs text-gray-600 mb-1">Reason</Text>
                    <Text className="text-sm">{selectedSwapDetail.reason}</Text>
                  </View>
                )}

                <View className="mb-4">
                  <Text className="text-xs text-gray-600">Status: <Text className="font-semibold text-blue-600">{selectedSwapDetail.status}</Text></Text>
                </View>

                <TouchableOpacity
                  className="bg-indigo-600 py-3 rounded-lg items-center"
                  onPress={() => setShowSwapDetailModal(false)}
                >
                  <Text className="text-white font-semibold">Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Components
interface TimeOffRequestCardProps {
  request: TimeOffRequest;
  isAdmin: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function TimeOffRequestCard({ request, isAdmin, onApprove, onReject }: TimeOffRequestCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <View className="mb-3 p-3 border border-gray-200 rounded-lg">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">{request.time_off_type.replace("_", " ").toUpperCase()}</Text>
          <Text className="text-sm text-gray-600">
            {request.start_date} to {request.end_date}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded ${getStatusColor(request.status)}`}>
          <Text className="text-xs font-semibold">{request.status}</Text>
        </View>
      </View>

      {request.reason && (
        <Text className="text-sm text-gray-600 mb-2">{request.reason}</Text>
      )}

      {isAdmin && request.status === "pending" && (
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className="flex-1 bg-green-600 py-2 rounded items-center"
            onPress={onApprove}
          >
            <Text className="text-white text-sm font-semibold">Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-600 py-2 rounded items-center"
            onPress={onReject}
          >
            <Text className="text-white text-sm font-semibold">Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface ShiftSwapCardProps {
  request: ShiftSwapRequest;
  type: "incoming" | "outgoing";
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

function ShiftSwapCard({ request, type, onPress, onAccept, onReject }: ShiftSwapCardProps) {
  return (
    <TouchableOpacity
      className="mb-3 p-3 border border-gray-200 rounded-lg active:bg-gray-50"
      onPress={onPress}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">
            {type === "incoming"
              ? `${request.requester_name} → You`
              : `You → ${request.target_name}`}
          </Text>
          <Text className="text-sm text-gray-600">
            {request.requester_shift_info.shift_type} ↔ {request.target_shift_info.shift_type}
          </Text>
        </View>
        <View className="bg-blue-100 px-2 py-1 rounded">
          <Text className="text-xs font-semibold text-blue-800">{request.status}</Text>
        </View>
      </View>

      {type === "incoming" && request.status === "pending" && (
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className="flex-1 bg-green-600 py-2 rounded items-center"
            onPress={onAccept}
          >
            <Text className="text-white text-sm font-semibold">Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-600 py-2 rounded items-center"
            onPress={onReject}
          >
            <Text className="text-white text-sm font-semibold">Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface AdminSwapCardProps {
  request: ShiftSwapRequest;
  onApprove: () => void;
  onReject: () => void;
  onPress?: () => void;
}

function AdminSwapCard({ request, onApprove, onReject, onPress }: AdminSwapCardProps) {
  return (
    <TouchableOpacity
      className="mb-3 p-3 border border-gray-200 rounded-lg active:bg-gray-50"
      onPress={onPress}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">
            {request.requester_name} ↔ {request.target_name}
          </Text>
          <Text className="text-sm text-gray-600">
            {request.requester_shift_info.shift_type} ↔ {request.target_shift_info.shift_type}
          </Text>
        </View>
        <View className="bg-orange-100 px-2 py-1 rounded">
          <Text className="text-xs font-semibold text-orange-800">Accepted</Text>
        </View>
      </View>

      <View className="flex-row gap-2 mt-2">
        <TouchableOpacity
          className="flex-1 bg-green-600 py-2 rounded items-center"
          onPress={onApprove}
        >
          <Text className="text-white text-sm font-semibold">Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-red-600 py-2 rounded items-center"
          onPress={onReject}
        >
          <Text className="text-white text-sm font-semibold">Reject</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function RequestRow({ title, subtitle, status }: { title: string; subtitle: string; status: string }) {
  return (
    <View className="mb-3 flex-row justify-between items-center">
      <View>
        <Text className="font-medium">{title}</Text>
        <Text className="text-gray-500 text-xs">{subtitle}</Text>
      </View>

      <Text className="text-sm font-medium text-indigo-600">{status}</Text>
    </View>
  );
}