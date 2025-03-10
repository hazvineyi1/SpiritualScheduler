import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "PPpp");
}

export function toISOString(date: Date) {
  return formatISO(date);
}

export const CONSULTATION_TYPES = [
  { value: "divination", label: "Divination" },
  { value: "spiritual_guidance", label: "Spiritual Guidance" },
  { value: "ancestral", label: "Ancestral Communication" },
];

export const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
];

export const PAYMENT_METHODS = [
  { value: "ecocash", label: "EcoCash" },
  { value: "western_union", label: "Western Union" },
  { value: "world_remit", label: "WorldRemit" },
  { value: "remitly", label: "Remitly" },
];

// Zimbabwe timezone offset (UTC+2)
export const TIMEZONE_OFFSET = 2;

export function adjustToZimbabweTime(date: Date): Date {
  const userOffset = date.getTimezoneOffset();
  const zimbabweOffset = -TIMEZONE_OFFSET * 60;
  const diffInMinutes = zimbabweOffset - userOffset;
  return new Date(date.getTime() + diffInMinutes * 60000);
}
