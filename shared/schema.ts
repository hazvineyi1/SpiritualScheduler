import { pgTable, text, serial, integer, json } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("healer"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  readingId: integer("reading_id"),
  readingName: text("reading_name").notNull(),
  category: text("category").notNull(),
  format: text("format").notNull(),
  datetime: text("datetime"),
  duration: integer("duration"),
  questionCount: integer("question_count"),
  status: text("status").notNull().default("pending_verification"),
  whatsappNumber: text("whatsapp_number").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentAmount: integer("payment_amount").notNull(),
  paymentReference: text("payment_reference"),
  clientName: text("client_name"),
  intakeAnswers: json("intake_answers").$type<Record<string, string>>(),
  sessionLink: text("session_link"),
  createdAt: text("created_at").notNull(),
});

export const insertAppointmentSchema = z.object({
  readingId: z.number().optional(),
  readingName: z.string().min(1, "Reading name required"),
  category: z.string().min(1),
  format: z.enum(["video", "audio", "chat", "async", "in_person"]),
  datetime: z.string().optional(),
  duration: z.number().int().positive().optional(),
  questionCount: z.number().int().positive().optional(),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number required"),
  paymentMethod: z.enum(["ecocash", "innbucks", "world_remit", "remitly"]),
  paymentAmount: z.number().positive("Amount required"),
  paymentReference: z.string().optional(),
  clientName: z.string().optional(),
  intakeAnswers: z.record(z.string()).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = { email: string; password: string; role?: string };
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// ---- Availability / scheduling -------------------------------------------
// The healer controls a weekly recurring schedule (which weekdays are open and
// the daily working window), plus one-off slot overrides (close an available
// slot, or re-open one). A slot is "booked" when an active appointment sits on
// it. Slots are a fixed length (minutes).
export const availabilityConfigSchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  slotMinutes: z.number().int().min(15).max(240),
  blockedSlots: z.array(z.string()),
});
export type AvailabilityConfig = z.infer<typeof availabilityConfigSchema>;

// Partial update (healer adjusts the weekly schedule). blockedSlots is managed
// through the dedicated block/unblock routes, not this update.
export const updateAvailabilitySchema = availabilityConfigSchema
  .omit({ blockedSlots: true })
  .partial();
export type UpdateAvailability = z.infer<typeof updateAvailabilitySchema>;

export type SlotStatus = "available" | "booked" | "closed" | "past";
export interface DaySlot {
  datetime: string; // ISO start of the slot
  label: string;    // e.g. "09:00"
  status: SlotStatus;
}
