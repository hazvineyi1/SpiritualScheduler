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
  clientId: integer("client_id").notNull().references(() => users.id),
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
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  amount: integer("amount").notNull(), // Store amount in cents to avoid floating point issues
  currency: text("currency").notNull(),
  method: text("method").notNull(), // ecocash, western_union, etc
  status: text("status").notNull().default("pending"),
  reference: text("reference"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  type: text("type").notNull(), // 'reminder', 'task', 'followup'
  priority: text("priority").notNull().default("medium"), // low, medium, high
});

// Enhanced validation schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["client", "practitioner", "admin"]),
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .extend({
    datetime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
    type: z.enum(["divination", "guidance", "ancestral"]),
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
    paymentStatus: z.enum(["pending", "paid", "failed"]),
    phoneNumber: z.string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^\+?[0-9]{10,15}$/, "Must be a valid international phone number"),
    consultationDetails: z.object({
      description: z.string().optional(),
      audioUrl: z.string().url("Invalid audio URL").optional(),
      videoUrl: z.string().url("Invalid video URL").optional(),
      imageUrls: z.array(z.string().url("Invalid image URL")).optional(),
    }).optional(),
  })
  .pick({
    clientId: true,
    datetime: true,
    duration: true,
    type: true,
    phoneNumber: true,
    consultationDetails: true,
  });

export const insertPaymentSchema = createInsertSchema(payments)
  .extend({
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().length(3, "Currency must be a 3-letter code"),
    method: z.enum(["ecocash", "western_union", "world_remit", "remitly"]),
    reference: z.string().optional(),
  })
  .pick({
    appointmentId: true,
    amount: true,
    currency: true,
    method: true,
    reference: true,
  });

export const insertTaskSchema = createInsertSchema(tasks)
  .extend({
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
    type: z.enum(["reminder", "task", "followup"]),
    priority: z.enum(["low", "medium", "high"]),
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