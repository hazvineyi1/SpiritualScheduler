import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, SlotUnavailableError } from "./storage";
import { insertAppointmentSchema, updateAvailabilitySchema } from "@shared/schema";
import { READINGS, PRODUCTS, SEEDED_REVIEWS } from "@shared/types";
import { ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    user?: { email: string; role: string; name: string };
  }
}

const ELLIE_WHATSAPP = "263771234567";

// Only the signed-in healer may manage the schedule and appointments.
function requireHealer(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user?.role === "healer") return next();
  return res.status(401).json({ success: false, error: "Please sign in as the healer to do that." });
}

function generateSessionLink(format: string): string {
  if (format === "in_person") return "Ellie's Studio, 14 Borrowdale Rd, Harare — address confirmed via WhatsApp.";
  // All remote sessions (video, audio, chat, async) happen over WhatsApp — no third-party links.
  return `https://wa.me/${ELLIE_WHATSAPP}`;
}

function buildWhatsAppVerifyUrl(apt: any): string {
  const date = apt.datetime ? new Date(apt.datetime).toLocaleString("en-ZW", { timeZone: "Africa/Harare" }) : "as arranged";
  const msg = `✨ Hi${apt.clientName ? ` ${apt.clientName}` : ""}! Your booking for *${apt.readingName}* is confirmed for ${date} (CAT). Ellie will message you here when it's time to begin. Thank you for booking with Elliestrator Botanica. 🌿`;
  return `https://wa.me/${apt.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Static data routes
  app.get("/api/readings", (_req, res) => {
    res.json({ success: true, data: READINGS });
  });

  app.get("/api/readings/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const reading = READINGS.find(r => r.id === id);
    if (!reading) return res.status(404).json({ success: false, error: "Reading not found" });
    res.json({ success: true, data: reading });
  });

  app.get("/api/products", (_req, res) => {
    res.json({ success: true, data: PRODUCTS });
  });

  app.get("/api/reviews", (_req, res) => {
    res.json({ success: true, data: SEEDED_REVIEWS });
  });

  // Appointments
  app.get("/api/appointments", requireHealer, async (_req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json({ success: true, data: appointments });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      res.json({ success: true, data: apt });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch appointment" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const data = insertAppointmentSchema.parse(req.body);
      const apt = await storage.createAppointment(data);
      res.json({ success: true, data: apt });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      }
      if (err instanceof SlotUnavailableError) {
        return res.status(409).json({ success: false, error: err.message });
      }
      console.error("Create appointment error:", err);
      res.status(500).json({ success: false, error: "Failed to create appointment" });
    }
  });

  // ---- Availability / scheduling ------------------------------------------
  app.get("/api/availability", async (_req, res) => {
    try {
      const config = await storage.getAvailability();
      res.json({ success: true, data: config });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch availability" });
    }
  });

  app.put("/api/availability", requireHealer, async (req, res) => {
    try {
      const update = updateAvailabilitySchema.parse(req.body);
      const config = await storage.updateAvailability(update);
      res.json({ success: true, data: config });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      }
      if (err instanceof SlotUnavailableError) {
        return res.status(400).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: "Failed to update availability" });
    }
  });

  app.get("/api/availability/slots", async (req, res) => {
    try {
      const date = String(req.query.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Provide a date as YYYY-MM-DD" });
      }
      const slots = await storage.getDaySlots(date);
      res.json({ success: true, data: { date, slots } });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch slots" });
    }
  });

  app.post("/api/availability/block", requireHealer, async (req, res) => {
    try {
      const { datetime } = req.body;
      if (!datetime) return res.status(400).json({ success: false, error: "datetime required" });
      const config = await storage.blockSlot(datetime);
      res.json({ success: true, data: config });
    } catch (err) {
      if (err instanceof SlotUnavailableError) {
        return res.status(400).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: "Failed to close slot" });
    }
  });

  app.post("/api/availability/unblock", requireHealer, async (req, res) => {
    try {
      const { datetime } = req.body;
      if (!datetime) return res.status(400).json({ success: false, error: "datetime required" });
      const config = await storage.unblockSlot(datetime);
      res.json({ success: true, data: config });
    } catch (err) {
      if (err instanceof SlotUnavailableError) {
        return res.status(400).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: "Failed to open slot" });
    }
  });

  app.patch("/api/appointments/:id/status", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const { status } = req.body;
      const allowed = ["pending_verification", "confirmed", "declined", "completed", "cancelled"];
      if (!allowed.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
      const apt = await storage.updateAppointmentStatus(id, status);
      res.json({ success: true, data: apt });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to update status" });
    }
  });

  app.post("/api/appointments/:id/verify", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      const sessionLink = generateSessionLink(apt.format);
      const updated = await storage.updateAppointmentStatus(id, "confirmed", sessionLink);
      const whatsappUrl = buildWhatsAppVerifyUrl(updated);
      res.json({ success: true, data: updated, whatsappUrl });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to verify appointment" });
    }
  });

  app.post("/api/appointments/:id/start", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      if (apt.status !== "confirmed") {
        return res.status(409).json({ success: false, error: "Only a confirmed session can be started" });
      }
      const updated = await storage.updateAppointmentStatus(id, "in_progress");
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to start session" });
    }
  });

  app.post("/api/appointments/:id/complete", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      if (apt.status !== "in_progress" && apt.status !== "confirmed") {
        return res.status(409).json({ success: false, error: "Only an active session can be completed" });
      }
      const updated = await storage.updateAppointmentStatus(id, "completed");
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to complete session" });
    }
  });

  app.post("/api/appointments/:id/decline", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const updated = await storage.updateAppointmentStatus(id, "declined");
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to decline appointment" });
    }
  });

  app.post("/api/appointments/:id/cancel", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const updated = await storage.cancelAppointment(id);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to cancel appointment" });
    }
  });

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });
      const user = await storage.getUserByEmail(String(email).toLowerCase().trim());
      if (!user || user.password !== password || user.role !== "healer") {
        return res.status(401).json({ success: false, error: "Invalid email or password." });
      }
      req.session.user = { email: user.email, role: user.role, name: "Ellie" };
      res.json({ success: true, data: req.session.user });
    } catch (err) {
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session?.user) return res.json({ success: true, data: req.session.user });
    res.status(401).json({ success: false, error: "Not signed in" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
