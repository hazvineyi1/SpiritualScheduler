import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAppointmentSchema, insertPaymentSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";

const dateRangeSchema = z.object({
  start: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  end: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
});

const appointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"])
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json({ success: true, data: user });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Validation error", 
          details: error.errors 
        });
      } else {
        console.error("User creation error:", error);
        res.status(500).json({ 
          success: false, 
          error: "Internal server error",
          message: "Failed to create user" 
        });
      }
    }
  });

  // Appointment routes
  app.get("/api/appointments", async (req, res) => {
    try {
      if (req.query.start || req.query.end) {
        const { start, end } = dateRangeSchema.parse({
          start: req.query.start,
          end: req.query.end
        });
        const appointments = await storage.getAppointmentsByDateRange(
          new Date(start),
          new Date(end)
        );
        return res.json({ success: true, data: appointments });
      }

      const appointments = await storage.getAllAppointments();
      res.json({ success: true, data: appointments });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Invalid date range", 
          details: error.errors 
        });
      } else {
        console.error("Appointment fetch error:", error);
        res.status(500).json({ 
          success: false, 
          error: "Internal server error",
          message: "Failed to fetch appointments" 
        });
      }
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      res.json({ success: true, data: appointment });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Validation error", 
          details: error.errors 
        });
      } else {
        console.error("Appointment creation error:", error);
        res.status(500).json({ 
          success: false, 
          error: "Internal server error",
          message: "Failed to create appointment" 
        });
      }
    }
  });

  app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new Error("Invalid appointment ID");
      }

      const { status } = appointmentStatusSchema.parse(req.body);
      const appointment = await storage.updateAppointmentStatus(id, status);

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: "Not found",
          message: "Appointment not found" 
        });
      }

      res.json({ success: true, data: appointment });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Invalid status", 
          details: error.errors 
        });
      } else {
        console.error("Status update error:", error);
        res.status(500).json({ 
          success: false, 
          error: "Internal server error",
          message: "Failed to update appointment status" 
        });
      }
    }
  });

  // Shared appointment route
  app.get("/api/appointments/shared/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new Error("Invalid appointment ID");
      }

      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: "Not found",
          message: "Appointment not found" 
        });
      }

      // Only send necessary information for shared view
      const sharedAppointment = {
        id: appointment.id,
        type: appointment.type,
        datetime: appointment.datetime,
        duration: appointment.duration,
        status: appointment.status,
      };

      res.json({ success: true, data: sharedAppointment });
    } catch (error) {
      console.error("Shared appointment fetch error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error",
        message: "Failed to fetch appointment" 
      });
    }
  });

  // Payment routes
  app.post("/api/payments", async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.json({ success: true, data: payment });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Validation error", 
          details: error.errors 
        });
      } else {
        console.error("Payment creation error:", error);
        res.status(500).json({ 
          success: false, 
          error: "Internal server error",
          message: "Failed to create payment" 
        });
      }
    }
  });

  app.get("/api/payments/appointment/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new Error("Invalid appointment ID");
      }

      const payments = await storage.getPaymentsByAppointment(id);
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error("Payment fetch error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error",
        message: "Failed to fetch payments" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}