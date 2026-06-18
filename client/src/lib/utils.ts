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
  { value: "divination", label: "Divination", price: 40 },
  { value: "guidance", label: "Spiritual Guidance", price: 50 },
  { value: "ancestral", label: "Ancestral Communication", price: 70 },
];

export const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
];

export const PAYMENT_METHODS = [
  {
    value: "ecocash",
    label: "EcoCash",
    instructions: "Send payment to merchant code: 123456\nInclude reference number in remarks.",
    requirements: ["Mobile number", "Reference number"],
    verificationUrl: "https://www.econet.co.zw/ecocash/check-transaction",
  },
  {
    value: "western_union",
    label: "Western Union",
    instructions: "Send to:\nName: [Business Name]\nLocation: Harare, Zimbabwe\nInclude reference number in message.",
    requirements: ["MTCN", "Sender name"],
    verificationUrl: "https://www.westernunion.com/us/en/track-transfer",
  },
  {
    value: "world_remit",
    label: "WorldRemit",
    instructions: "Send to mobile money:\nAccount: +263 XX XXX XXXX\nInclude reference as payment reference.",
    requirements: ["Transaction ID", "Sender email"],
    verificationUrl: "https://www.worldremit.com/en/track-transfer",
  },
  {
    value: "remitly",
    label: "Remitly",
    instructions: "Send to bank account:\nBank: [Bank Name]\nAccount: XXXXXXXXXXXXX\nInclude reference in notes.",
    requirements: ["Transfer number", "Sender name"],
    verificationUrl: "https://www.remitly.com/track/status",
  }
];

// Zimbabwe timezone offset (UTC+2)
export const TIMEZONE_OFFSET = 2;

export function adjustToZimbabweTime(date: Date): Date {
  const userOffset = date.getTimezoneOffset();
  const zimbabweOffset = -TIMEZONE_OFFSET * 60;
  const diffInMinutes = zimbabweOffset - userOffset;
  return new Date(date.getTime() + diffInMinutes * 60000);
}

export function generatePaymentReference(appointmentId: number, method: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${method.toUpperCase()}-${year}${month}${day}-${appointmentId}`;
}