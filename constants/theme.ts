export const Colors = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  text: "#0F172A",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  success: "#10B981",
  successLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  info: "#3B82F6",
  infoLight: "#EFF6FF",
}

export const ShiftColors: Record<string, { bg: string; text: string; border: string }> = {
  day:     { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  Day:     { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  night:   { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" },
  Night:   { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" },
  late:    { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4" },
  Late:    { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4" },
  on_call: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
  "On Call": { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
}

export const StatusColors: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#FFFBEB", text: "#92400E" },
  accepted:  { bg: "#ECFDF5", text: "#065F46" },
  approved:  { bg: "#EEF2FF", text: "#3730A3" },
  rejected:  { bg: "#FEF2F2", text: "#991B1B" },
  cancelled: { bg: "#F1F5F9", text: "#64748B" },
  assigned:  { bg: "#EFF6FF", text: "#1E40AF" },
  confirmed: { bg: "#ECFDF5", text: "#065F46" },
}

export const Shadow = {
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
}
