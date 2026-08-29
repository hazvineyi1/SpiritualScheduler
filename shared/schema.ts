import { pgTable, text, serial, integer, json, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

// Each row is one independent healer hub. Readings, products, and
// availability are stored as JSON on the healer's own row; every healer's
// catalog and schedule is entirely self-contained and never shared or
// queried across healers.
export const healers = pgTable("healers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  location: text("location").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  country: text("country").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  headerImageUrl: text("header_image_url").notNull().default(""),
  zinathaVerified: boolean("zinatha_verified").notNull().default(false),
  shopEnabled: boolean("shop_enabled").notNull().default(true),
  readings: json("readings").$type<any[]>().notNull().default([]),
  products: json("products").$type<any[]>().notNull().default([]),
  availability: json("availability").$type<AvailabilityConfig>(),
  createdAt: text("created_at").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  healerId: integer("healer_id").notNull(),
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

export const insertHealerSchema = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name required"),
  tagline: z.string().optional(),
  location: z.string().optional(),
  whatsapp: z.string().min(10, "Valid WhatsApp number required"),
  country: z.string().min(1, "Please select the country you align with"),
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

export type Healer = typeof healers.$inferSelect;
export type InsertHealer = z.infer<typeof insertHealerSchema>;
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

// ---- Interest form leads --------------------------------------------------
// Healers who aren't ready for a full hub yet can leave their details to be
// contacted later. Kept entirely separate from the healers table — a lead
// has no login, no hub, nothing public.
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  country: text("country").notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const insertLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().min(5, "Please share a WhatsApp number or email"),
  country: z.string().optional(),
  message: z.string().optional(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
