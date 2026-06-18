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
