/* ---------------------------------- design tokens ---------------------------------- */
export const COLORS = {
  navy: "#2D2F33",
  navySoft: "#3A3C41",
  navyLight: "#4A4C50",
  ink: "#1F2124",
  paper: "#F7F7F7",
  paperWarm: "#F5F5F7",
  card: "#FFFFFF",
  line: "#E5E7EB",
  lineLight: "#F3F4F6",
  accent: "#FE8029",
  accentDark: "#E67422",
  accentSoft: "#FFF4EB",
  teal: "#0891B2",
  tealSoft: "#CFFAFE",
  amber: "#D97706",
  amberSoft: "#FEF3C7",
  red: "#DC2626",
  redSoft: "#FEE2E2",
  green: "#16A34A",
  greenSoft: "#DCFCE7",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
  pink: "#DB2777",
  pinkSoft: "#FCE7F3",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  graySoft: "#F3F4F6",
};

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  backlog: { label: "Backlog", color: "#6B7280", bg: "#F3F4F6" },
  in_progress: { label: "In Progress", color: "#FE8029", bg: "#FFF4EB" },
  review: { label: "In Review", color: "#7C3AED", bg: "#EDE9FE" },
  done: { label: "Done", color: "#16A34A", bg: "#DCFCE7" },
};
export const STATUS_ORDER = ["backlog", "in_progress", "review", "done"];

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "#6B7280" },
  medium: { label: "Medium", color: "#0891B2" },
  high: { label: "High", color: "#D97706" },
  urgent: { label: "Urgent", color: "#DC2626" },
};

export const RAID_META: Record<string, { label: string; color: string; bg: string }> = {
  risk: { label: "Risk", color: "#DC2626", bg: "#FEE2E2" },
  assumption: { label: "Assumption", color: "#0891B2", bg: "#CFFAFE" },
  issue: { label: "Issue", color: "#D97706", bg: "#FEF3C7" },
  dependency: { label: "Dependency", color: "#7C3AED", bg: "#EDE9FE" },
};
export const RAID_ORDER = ["risk", "assumption", "issue", "dependency"];

export const IMPACT_META: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "#6B7280" },
  medium: { label: "Medium", color: "#D97706" },
  high: { label: "High", color: "#DC2626" },
};

export const PROJECT_COLORS = ["#FE8029", "#0891B2", "#D97706", "#DC2626", "#16A34A", "#7C3AED", "#DB2777", "#2D2F33"];

export const COLOR_SWATCHES = ["#FE8029", "#0891B2", "#D97706", "#DC2626", "#16A34A", "#7C3AED", "#DB2777", null];

/* ---------------------------------- tag colors ---------------------------------- */
export const TAG_COLORS = [
  { bg: '#FFF4EB', text: '#9A3412', border: '#FED7AA' },  // orange
  { bg: '#CFFAFE', text: '#155E75', border: '#A5F3FC' },  // teal
  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },  // amber
  { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },  // red
  { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },  // green
  { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },  // purple
  { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8' },  // pink
  { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },  // gray
];

/* ---------------------------------- due date ---------------------------------- */
export const DUE_STATUS = {
  overdue:  { label: 'Overdue',  color: '#DC2626', bg: '#FEE2E2' },
  today:    { label: 'Today',    color: '#D97706', bg: '#FEF3C7' },
  tomorrow: { label: 'Tomorrow', color: '#D97706', bg: '#FEF9EE' },
  soon:     { label: 'This week',color: '#0891B2', bg: '#CFFAFE' },
  normal:   { label: '',         color: '#6B7280', bg: '#F3F4F6' },
  none:     { label: '',         color: '#9CA3AF', bg: '#F9FAFB' },
} as const;

export const ZOOM_LEVELS = [
  { label: "Compact", width: 14 },
  { label: "Default", width: 28 },
  { label: "Wide", width: 44 },
];

export const SHEET_COLUMNS = [
  { key: "name", label: "Task", width: 240, type: "text" },
  { key: "assignee", label: "Assignee", width: 150, type: "select-assignee" },
  { key: "dueDate", label: "Due Date", width: 130, type: "date" },
  { key: "start", label: "Start", width: 130, type: "date" },
  { key: "duration", label: "Duration", width: 110, type: "duration" },
  { key: "progress", label: "Progress %", width: 110, type: "progress" },
  { key: "priority", label: "Priority", width: 120, type: "select-priority" },
  { key: "status", label: "Status", width: 140, type: "select-status" },
];

export const NAV_ITEMS = [
  { id: "mytasks", label: "My Tasks" },
  { id: "dashboard", label: "Dashboard" },
  { id: "timeline", label: "Timeline" },
  { id: "board", label: "Board" },
  { id: "sheet", label: "Sheet" },
  { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" },
  { id: "raid", label: "RAID Log" },
  { id: "files", label: "Files" },
  { id: "team", label: "Team" },
  { id: "reports", label: "Reports" },
  { id: "deps", label: "Dependencies" },
  { id: "inbox", label: "Inbox" },
];

/* ---------------------------------- layout tokens ---------------------------------- */
export const LAYOUT = {
  sidebar: { width: 248, bg: '#2D2F33', textMuted: '#9CA3AF', textActive: '#E5E7EB', textDim: '#6B7280', divider: 'rgba(255,255,255,0.08)', hoverBg: 'rgba(255,255,255,0.06)', activeBg: 'rgba(254,128,41,0.15)', activeDot: '#FE8029' },
  topbar: { height: 56, bg: '#FFFFFF', border: '#E5E7EB', searchBg: '#F3F4F6', searchBorder: '#E5E7EB' },
  content: { bg: '#F7F7F7', padding: 24, radius: 0 },
  card: { bg: '#FFFFFF', border: '#E5E7EB', radius: 16, shadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)', shadowLg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)' },
  btn: { primary: '#FE8029', primaryHover: '#E67422', radius: 10 },
  text: { primary: '#1F2124', secondary: '#6B7280', muted: '#9CA3AF' },
};

export const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

/* ---------------------------------- epic palette ---------------------------------- */
export interface ColorInfo { bg: string; bar: string; barLight: string; text: string; }
export const EPIC_PALETTE: ColorInfo[] = [
  { bg: '#FFF4EB', bar: '#FE8029', barLight: '#FED7AA', text: '#9A3412' },
  { bg: '#CFFAFE', bar: '#0891B2', barLight: '#A5F3FC', text: '#155E75' },
  { bg: '#FEF3C7', bar: '#D97706', barLight: '#FDE68A', text: '#92400E' },
  { bg: '#FEE2E2', bar: '#DC2626', barLight: '#FECACA', text: '#991B1B' },
  { bg: '#DCFCE7', bar: '#16A34A', barLight: '#BBF7D0', text: '#166534' },
  { bg: '#EDE9FE', bar: '#7C3AED', barLight: '#DDD6FE', text: '#5B21B6' },
  { bg: '#FCE7F3', bar: '#DB2777', barLight: '#FBCFE8', text: '#9D174D' },
  { bg: '#F3F4F6', bar: '#6B7280', barLight: '#D1D5DB', text: '#374151' },
];
export const TASK_COLOR_FALLBACK = '#9CA3AF';
