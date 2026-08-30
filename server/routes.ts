import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, SlotUnavailableError, NotFoundError } from "./storage";
import { insertAppointmentSchema, insertHealerSchema, updateAvailabilitySchema, insertLeadSchema, insertFeedbackSchema } from "@shared/schema";
import { sendNotificationEmail } from "./services/email";

// Best-effort city/country lookup from an IP address, for visit tracking.
// Never throws — a failed or rate-limited lookup just means an unknown
// location, not a broken request.
async function geolocateIp(ip: string): Promise<{ city: string; country: string }> {
  const cleaned = ip.replace(/^::ffff:/, "");
  console.log(`[geolocate] raw ip: "${ip}" cleaned: "${cleaned}"`);
  if (!cleaned || cleaned === "127.0.0.1" || cleaned === "::1" || cleaned.startsWith("10.") || cleaned.startsWith("192.168.")) {
    console.log(`[geolocate] skipped — looks private/local`);
    return { city: "", country: "" };
  }
  try {
    const res = await fetch(`https://ipapi.co/${cleaned}/json/`, { signal: AbortSignal.timeout(2500) });
    console.log(`[geolocate] fetch status: ${res.status}`);
    if (!res.ok) {
      const body = await res.text();
      console.log(`[geolocate] non-ok body: ${body.slice(0, 200)}`);
      return { city: "", country: "" };
    }
    const data = await res.json();
    console.log(`[geolocate] response:`, JSON.stringify(data).slice(0, 300));
    return { city: data.city || "", country: data.country_name || "" };
  } catch (err) {
    console.log(`[geolocate] error:`, err instanceof Error ? err.message : err);
    return { city: "", country: "" };
  }
}
import { ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    // healerId is the sole source of truth for every authenticated action;
    // a signed-in healer can only ever read or modify their own hub's data.
    user?: { healerId: number; slug: string; email: string; name: string };
  }
}

// Only the signed-in healer may manage their own schedule and appointments.
function requireHealer(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user?.healerId) return next();
  return res.status(401).json({ success: false, error: "Please sign in to do that." });
}

function generateSessionLink(healerName: string, healerWhatsapp: string, format: string): string {
  if (format === "in_person") return `${healerName}'s address will be confirmed via WhatsApp.`;
  return `https://wa.me/${healerWhatsapp}`;
}

function buildWhatsAppVerifyUrl(apt: any, healerName: string): string {
  const date = apt.datetime ? new Date(apt.datetime).toLocaleString("en-ZW", { timeZone: "Africa/Harare" }) : "as arranged";
  const msg = `Hi${apt.clientName ? ` ${apt.clientName}` : ""}! Your booking for *${apt.readingName}* is confirmed for ${date} (CAT). ${healerName} will message you here when it's time to begin. Thank you for booking.`;
  return `https://wa.me/${apt.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

// Strips credentials and internal fields before a healer record is ever
// sent to the public (directory listing or a hub's own storefront).
function publicHealer(h: Awaited<ReturnType<typeof storage.getHealer>>) {
  if (!h) return h;
  const { password, email, ...pub } = h;
  return pub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ---- Public directory & healer profiles ---------------------------------
  app.get("/api/healers", async (req, res) => {
    try {
      const healers = await storage.listHealers();
      const country = typeof req.query.country === "string" ? req.query.country.toLowerCase() : undefined;
      const filtered = country ? healers.filter(h => h.country === country) : healers;
      res.json({ success: true, data: filtered.map(publicHealer) });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch hubs" });
    }
  });

  app.get("/api/healers/:slug", async (req, res) => {
    try {
      const healer = await storage.getHealerBySlug(req.params.slug);
      if (!healer) return res.status(404).json({ success: false, error: "Hub not found" });
      res.json({ success: true, data: publicHealer(healer) });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch hub" });
    }
  });

  app.post("/api/healers", async (req, res) => {
    try {
      const data = insertHealerSchema.parse(req.body);
      const existingSlug = await storage.getHealerBySlug(data.slug);
      if (existingSlug) return res.status(409).json({ success: false, error: "That hub name is already taken." });
      const existingEmail = await storage.getHealerByEmail(data.email.toLowerCase().trim());
      if (existingEmail) return res.status(409).json({ success: false, error: "An account with that email already exists." });
      const healer = await storage.createHealer({ ...data, email: data.email.toLowerCase().trim() });
      req.session.user = { healerId: healer.id, slug: healer.slug, email: healer.email, name: healer.name };
      res.json({ success: true, data: publicHealer(healer) });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message || "Validation error", details: err.errors });
      }
      res.status(500).json({ success: false, error: "Failed to create hub" });
    }
  });

  // ---- Interest form leads --------------------------------------------------
  // Public: anyone can leave their details to be contacted later. No login,
  // no hub created — kept entirely separate from real healer accounts.
  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.json({ success: true, data: lead });
      // Fire-and-forget: the submission has already succeeded above either way.
      sendNotificationEmail(
        "info@synops-consulting.com",
        `New interest form submission from ${lead.name}`,
        `${lead.name} left their details on the healer marketing page:\n\n` +
          `Contact: ${lead.contact}\n` +
          (lead.country ? `Country: ${lead.country}\n` : "") +
          (lead.message ? `Message: "${lead.message}"\n` : "") +
          `\nSubmitted ${new Date(lead.createdAt).toLocaleString()}.`,
      );
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message || "Validation error", details: err.errors });
      }
      res.status(500).json({ success: false, error: "Failed to submit" });
    }
  });

  // Admin-only: lists submitted leads. Protected by a shared key rather than
  // the healer login system, since this isn't a healer-facing feature.
  app.get("/api/leads", async (req, res) => {
    const key = req.header("x-admin-key");
    const expected = process.env.ADMIN_KEY || "vashava-admin-2026";
    if (!key || key !== expected) {
      return res.status(401).json({ success: false, error: "Invalid admin key" });
    }
    try {
      const leads = await storage.listLeads();
      res.json({ success: true, data: leads });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch leads" });
    }
  });

  // ---- Trial-user feedback ---------------------------------------------
  app.post("/api/feedback", async (req, res) => {
    try {
      const data = insertFeedbackSchema.parse(req.body);
      const entry = await storage.createFeedback(data);
      res.json({ success: true, data: entry });
      // Fire-and-forget: the submission has already succeeded above either way.
      sendNotificationEmail(
        "info@synops-consulting.com",
        `New feedback${entry.name ? ` from ${entry.name}` : ""}`,
        `${entry.name || "Someone"} left feedback on African Spiritual Hub:\n\n"${entry.message}"\n\nSubmitted ${new Date(entry.createdAt).toLocaleString()}.`,
      );
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: err.errors[0]?.message || "Validation error", details: err.errors });
      }
      res.status(500).json({ success: false, error: "Failed to submit" });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    const key = req.header("x-admin-key");
    const expected = process.env.ADMIN_KEY || "vashava-admin-2026";
    if (!key || key !== expected) {
      return res.status(401).json({ success: false, error: "Invalid admin key" });
    }
    try {
      const entries = await storage.listFeedback();
      res.json({ success: true, data: entries });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch feedback" });
    }
  });

  // ---- Visit tracking ---------------------------------------------------
  // Public: called when a demo hub or marketing page loads, and again
  // periodically (heartbeat) while the visitor stays on it.
  app.post("/api/visits/start", async (req, res) => {
    try {
      const path = typeof req.body?.path === "string" ? req.body.path.slice(0, 200) : "/";
      const ip = req.ip || "";
      const { city, country } = await geolocateIp(ip);
      const visit = await storage.startVisit(path, city, country);
      res.json({ success: true, data: { id: visit.id } });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to record visit" });
    }
  });

  app.post("/api/visits/:id/heartbeat", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid visit id" });
      await storage.heartbeatVisit(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to update visit" });
    }
  });

  app.get("/api/visits", async (req, res) => {
    const key = req.header("x-admin-key");
    const expected = process.env.ADMIN_KEY || "vashava-admin-2026";
    if (!key || key !== expected) {
      return res.status(401).json({ success: false, error: "Invalid admin key" });
    }
    try {
      const visits = await storage.listVisits();
      res.json({ success: true, data: visits });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch visits" });
    }
  });


  // ---- Public booking (scoped to one healer via slug) ---------------------
  app.get("/api/healers/:slug/availability", async (req, res) => {
    try {
      const healer = await storage.getHealerBySlug(req.params.slug);
      if (!healer) return res.status(404).json({ success: false, error: "Hub not found" });
      const config = await storage.getAvailability(healer.id);
      res.json({ success: true, data: config });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch availability" });
    }
  });

  app.get("/api/healers/:slug/slots", async (req, res) => {
    try {
      const healer = await storage.getHealerBySlug(req.params.slug);
      if (!healer) return res.status(404).json({ success: false, error: "Hub not found" });
      const date = String(req.query.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Provide a date as YYYY-MM-DD" });
      }
      const slots = await storage.getDaySlots(healer.id, date);
      res.json({ success: true, data: { date, slots } });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch slots" });
    }
  });

  app.post("/api/healers/:slug/appointments", async (req, res) => {
    try {
      const healer = await storage.getHealerBySlug(req.params.slug);
      if (!healer) return res.status(404).json({ success: false, error: "Hub not found" });
      const data = insertAppointmentSchema.parse(req.body);
      const apt = await storage.createAppointment(healer.id, data);
      res.json({ success: true, data: apt });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      }
      if (err instanceof SlotUnavailableError || err instanceof NotFoundError) {
        return res.status(409).json({ success: false, error: err.message });
      }
      console.error("Create appointment error:", err);
      res.status(500).json({ success: false, error: "Failed to create appointment" });
    }
  });

  // ---- Authenticated dashboard (always scoped to req.session.user.healerId,
  // never to a slug or id supplied by the request. A healer can only ever
  // act as themselves) --------------------------------------------------
  app.get("/api/appointments", requireHealer, async (req, res) => {
    try {
      const appointments = await storage.getAppointments(req.session.user!.healerId);
      res.json({ success: true, data: appointments });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(req.session.user!.healerId, id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      res.json({ success: true, data: apt });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch appointment" });
    }
  });

  app.get("/api/availability", requireHealer, async (req, res) => {
    try {
      const config = await storage.getAvailability(req.session.user!.healerId);
      res.json({ success: true, data: config });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch availability" });
    }
  });

  app.get("/api/availability/slots", requireHealer, async (req, res) => {
    try {
      const date = String(req.query.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Provide a date as YYYY-MM-DD" });
      }
      const slots = await storage.getDaySlots(req.session.user!.healerId, date);
      res.json({ success: true, data: { date, slots } });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch slots" });
    }
  });

  app.put("/api/availability", requireHealer, async (req, res) => {
    try {
      const update = updateAvailabilitySchema.parse(req.body);
      const config = await storage.updateAvailability(req.session.user!.healerId, update);
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

  app.post("/api/availability/block", requireHealer, async (req, res) => {
    try {
      const { datetime } = req.body;
      if (!datetime) return res.status(400).json({ success: false, error: "datetime required" });
      const config = await storage.blockSlot(req.session.user!.healerId, datetime);
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
      const config = await storage.unblockSlot(req.session.user!.healerId, datetime);
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
      const apt = await storage.updateAppointmentStatus(req.session.user!.healerId, id, status);
      res.json({ success: true, data: apt });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ success: false, error: err.message });
      res.status(500).json({ success: false, error: "Failed to update status" });
    }
  });

  app.post("/api/appointments/:id/verify", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const healer = await storage.getHealer(req.session.user!.healerId);
      if (!healer) return res.status(404).json({ success: false, error: "Hub not found" });
      const apt = await storage.getAppointment(healer.id, id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      const sessionLink = generateSessionLink(healer.name, healer.whatsapp, apt.format);
      const updated = await storage.updateAppointmentStatus(healer.id, id, "confirmed", sessionLink);
      const whatsappUrl = buildWhatsAppVerifyUrl(updated, healer.name);
      res.json({ success: true, data: updated, whatsappUrl });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to verify appointment" });
    }
  });

  app.post("/api/appointments/:id/start", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(req.session.user!.healerId, id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      if (apt.status !== "confirmed") {
        return res.status(409).json({ success: false, error: "Only a confirmed session can be started" });
      }
      const updated = await storage.updateAppointmentStatus(req.session.user!.healerId, id, "in_progress");
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to start session" });
    }
  });

  app.post("/api/appointments/:id/complete", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const apt = await storage.getAppointment(req.session.user!.healerId, id);
      if (!apt) return res.status(404).json({ success: false, error: "Not found" });
      if (apt.status !== "in_progress" && apt.status !== "confirmed") {
        return res.status(409).json({ success: false, error: "Only an active session can be completed" });
      }
      const updated = await storage.updateAppointmentStatus(req.session.user!.healerId, id, "completed");
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to complete session" });
    }
  });

  app.post("/api/appointments/:id/decline", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const updated = await storage.updateAppointmentStatus(req.session.user!.healerId, id, "declined");
      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ success: false, error: err.message });
      res.status(500).json({ success: false, error: "Failed to decline appointment" });
    }
  });

  app.post("/api/appointments/:id/cancel", requireHealer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });
      const updated = await storage.cancelAppointment(req.session.user!.healerId, id);
      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ success: false, error: err.message });
      res.status(500).json({ success: false, error: "Failed to cancel appointment" });
    }
  });

  // Wipes only the signed-in healer's own appointment data.
  app.post("/api/appointments/reset-all", requireHealer, async (req, res) => {
    try {
      await storage.resetAppointments(req.session.user!.healerId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to reset data" });
    }
  });

  app.put("/api/profile", requireHealer, async (req, res) => {
    try {
      const { name, tagline, location, whatsapp, avatarUrl, headerImageUrl, shopEnabled, country } = req.body;
      if (!name?.trim()) return res.status(400).json({ success: false, error: "Name is required" });
      const updated = await storage.updateHealerProfile(req.session.user!.healerId, { name, tagline, location, whatsapp, avatarUrl, headerImageUrl, shopEnabled, country });
      req.session.user!.name = updated.name;
      res.json({ success: true, data: publicHealer(updated) });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to update profile" });
    }
  });

  app.put("/api/catalog", requireHealer, async (req, res) => {
    try {
      const { readings, products } = req.body;
      if (!Array.isArray(readings) || !Array.isArray(products)) {
        return res.status(400).json({ success: false, error: "readings and products must be arrays" });
      }
      for (const r of readings) {
        if (!r.name?.trim() || !r.category?.trim() || typeof r.price !== "number" || r.price <= 0) {
          return res.status(400).json({ success: false, error: "Each reading needs a name, category, and price greater than 0." });
        }
        if (!Array.isArray(r.formats) || r.formats.length === 0) {
          return res.status(400).json({ success: false, error: `"${r.name}" needs at least one session format.` });
        }
      }
      for (const p of products) {
        if (!p.name?.trim() || typeof p.price !== "number" || p.price <= 0) {
          return res.status(400).json({ success: false, error: "Each product needs a name and price greater than 0." });
        }
      }
      // Renumber IDs sequentially server-side so client-generated temp IDs
      // (for newly added items) can never collide with existing ones.
      const cleanReadings = readings.map((r: any, i: number) => ({ ...r, id: i + 1, price: Math.round(r.price) }));
      const cleanProducts = products.map((p: any, i: number) => ({ ...p, id: i + 1, price: Math.round(p.price) }));
      const updated = await storage.updateHealerCatalog(req.session.user!.healerId, cleanReadings, cleanProducts);
      res.json({ success: true, data: publicHealer(updated) });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to update catalog" });
    }
  });

  // ---- Auth -----------------------------------------------------------
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });
      const healer = await storage.getHealerByEmail(String(email).toLowerCase().trim());
      if (!healer || healer.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid email or password." });
      }
      req.session.user = { healerId: healer.id, slug: healer.slug, email: healer.email, name: healer.name };
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
