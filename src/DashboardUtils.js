import { Box, Database, Code2, BarChart3, Binary, Wifi, MessageSquare, Atom } from "lucide-react";

export const UNIT_ICONS = {
  box: Box,
  database: Database,
  code: Code2,
  chart: BarChart3,
  binary: Binary,
  wifi: Wifi,
  message: MessageSquare,
  atom: Atom,
};

export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getDaysUntil(dueDate) {
  const due = parseLocalDate(dueDate);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}