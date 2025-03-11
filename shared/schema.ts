import { pgTable, text, serial, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Existing tables remain unchanged
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("client"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  datetime: timestamp("datetime").notNull(),
  duration: integer("duration").notNull(), // in minutes
  type: text("type").notNull(), // divination, guidance, ancestral
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"),
  phoneNumber: text("phone_number").notNull(),
  consultationDetails: json("consultation_details").$type<{
    description?: string;
    audioUrl?: string;
    videoUrl?: string;
    imageUrls?: string[];
  }>(),
  practitionerNotes: text("practitioner_notes"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  method: text("method").notNull(), // ecocash, western_union, etc
  status: text("status").notNull().default("pending"),
  reference: text("reference"),
});

// New table for tasks and reminders
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  type: text("type").notNull(), // 'reminder', 'task', 'followup'
  priority: text("priority").notNull().default("medium"), // low, medium, high
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .extend({
    datetime: z.string(), // Accept ISO string format
    phoneNumber: z.string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^\+?[0-9]+$/, "Must be a valid phone number"),
  })
  .pick({
    clientId: true,
    datetime: true,
    duration: true,
    type: true,
    phoneNumber: true,
    consultationDetails: true,
  })
  .partial({ clientId: true });

export const insertPaymentSchema = createInsertSchema(payments).pick({
  appointmentId: true,
  amount: true,
  currency: true,
  method: true,
  reference: true,
});

// New schema for tasks
export const insertTaskSchema = createInsertSchema(tasks)
  .extend({
    dueDate: z.string(), // Accept ISO string format
  })
  .pick({
    userId: true,
    appointmentId: true,
    title: true,
    description: true,
    dueDate: true,
    type: true,
    priority: true,
  });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;