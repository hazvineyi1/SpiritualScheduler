import {
  type Healer, type InsertHealer, type Appointment, type InsertAppointment,
  type AvailabilityConfig, type UpdateAvailability, type DaySlot, type SlotStatus,
  type Lead, type InsertLead,
  healers as healersTable, appointments as appointmentsTable, leads as leadsTable,
} from "@shared/schema";
import { STARTER_READINGS, STARTER_PRODUCTS, type Reading, type Product } from "@shared/types";
import { db, ensureSchema } from "./db";
import { eq } from "drizzle-orm";

// Thrown by createAppointment when the requested slot can't be booked.
export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

// Thrown when an action targets a healer/appointment that doesn't belong to
// the acting healer, or a slug that isn't registered. Kept distinct from a
// generic 404 so routes can respond with the right status code.
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// Statuses that "hold" a slot (prevent it from being double-booked).
const OCCUPYING_STATUSES = ["pending_verification", "confirmed", "in_progress"];

// Zimbabwe runs at a fixed UTC+2 (no DST). Shift a UTC instant into Harare
// wall-clock so getUTC* reads back local parts.
const HARARE_OFFSET_MS = 2 * 60 * 60 * 1000;
function harareParts(d: Date) {
  const h = new Date(d.getTime() + HARARE_OFFSET_MS);
  return {
    weekday: h.getUTCDay(),
    hour: h.getUTCHours(),
    minute: h.getUTCMinutes(),
    dateStr: h.toISOString().slice(0, 10),
  };
}
// Build the UTC ISO instant for a Harare wall-clock slot.
function slotIso(dateStr: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${dateStr}T${hh}:${mm}:00+02:00`).toISOString();
}
function slotLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  weekdays: [1, 2, 3, 4, 5, 6], // Mon–Sat open by default
  startHour: 9,
  endHour: 17,
  slotMinutes: 60,
  blockedSlots: [],
};

export interface IStorage {
  // Loads persisted data (if a database is configured) and seeds the
  // platform's first hub on a genuinely empty database. Must be awaited
  // once at server startup before handling any requests.
  initialize(): Promise<void>;

  // Healers: every healer's data (readings, products, availability,
  // appointments) lives only on that healer's own record. No query here
  // ever reads across healers except listHealers(), which returns only
  // public directory fields (never catalogs, appointments, or credentials).
  getHealer(id: number): Promise<Healer | undefined>;
  getHealerBySlug(slug: string): Promise<Healer | undefined>;
  getHealerByEmail(email: string): Promise<Healer | undefined>;
  createHealer(data: InsertHealer): Promise<Healer>;
  listHealers(): Promise<Healer[]>;
  updateHealerProfile(id: number, updates: Partial<Pick<Healer, "name" | "tagline" | "location" | "whatsapp" | "avatarUrl" | "headerImageUrl" | "shopEnabled" | "country">>): Promise<Healer>;
  updateHealerCatalog(id: number, readings: Reading[], products: Product[]): Promise<Healer>;

  getAppointments(healerId: number): Promise<Appointment[]>;
  getAppointment(healerId: number, id: number): Promise<Appointment | undefined>;
  createAppointment(healerId: number, appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(healerId: number, id: number, status: string, sessionLink?: string): Promise<Appointment>;
  cancelAppointment(healerId: number, id: number): Promise<Appointment>;
  resetAppointments(healerId: number): Promise<void>;

  getAvailability(healerId: number): Promise<AvailabilityConfig>;
  updateAvailability(healerId: number, update: UpdateAvailability): Promise<AvailabilityConfig>;
  blockSlot(healerId: number, datetime: string): Promise<AvailabilityConfig>;
  unblockSlot(healerId: number, datetime: string): Promise<AvailabilityConfig>;
  getDaySlots(healerId: number, dateStr: string): Promise<DaySlot[]>;

  // Interest form leads — entirely separate from healers; no login, no hub.
  createLead(data: InsertLead): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
}

// A small rotation of nature/heritage images given to new hubs as a starting
// header photo. Each healer can replace it any time from Hub Settings.
const DEFAULT_HEADER_IMAGES = ["/images/default-header-1.jpg", "/images/default-header-2.jpg", "/images/default-header-3.jpg"];

export class MemStorage implements IStorage {
  private healers: Map<number, Healer>;
  private appointments: Map<number, Appointment>;
  private leads: Map<number, Lead> = new Map();
  private healerIds = 1;
  private appointmentIds = 1;
  private leadIds = 1;

  constructor() {
    this.healers = new Map();
    this.appointments = new Map();
  }

  // VaShava's real data, migrated as the platform's first hub. Used both as
  // the in-memory-only seed (no database configured) and as the one-time
  // database seed on a genuinely fresh database.
  private vashavaSeed(): Omit<Healer, "id"> {
    return {
      slug: "vashava",
      email: "vashava@vashava.com",
      password: "healer123",
      name: "VaShava",
      tagline: "Where Ancient Wisdom Meets Modern Healing",
      location: "Harare, Zimbabwe · worldwide",
      whatsapp: "263771234567",
      country: "zimbabwe",
      avatarUrl: "/images/vashava-avatar.jpg",
      headerImageUrl: "/images/eland.jpg",
      zinathaVerified: true,
      shopEnabled: true,
      readings: [
        { id: 1, name: "Matare/Consultation", category: "Guidance & Consultation", price: 20, description: "Kukurukura namuchembere: a general consultation to discuss whatever is on your mind with VaShava.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 2, name: "Yes/No Questions", category: "Guidance & Consultation", price: 10, description: "Mibvunzo inoda Hongu kana Kwete: quick, direct answers to yes-or-no questions.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 3, name: "Career Guidance", category: "Guidance & Consultation", price: 20, description: "Guidance on how to earn a living and navigate your career path.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 4, name: "Dreams/Makope Interpretation", category: "Guidance & Consultation", price: 10, description: "Kutsanangurirwa makope nezvaanoreva: understand what your dreams mean and the messages behind them.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false, customIntake: [{ field: "dream", label: "Describe your dream in as much detail as possible" }] },
        { id: 5, name: "Kunatira neKurutsiswa", category: "Ancestral & Cleansing", price: 30, description: "Kunatiriswa kana kuritsiswa namuchembere: traditional cleansing and spiritual help from the elder.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 6, name: "Kusimudza Muchembere", category: "Ancestral & Cleansing", price: 50, description: "Kusimudza muchembere kuuya kwake: invoking and raising the ancestral spirit to come forward.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 7, name: "Kutsikira Masango", category: "Ancestral & Cleansing", price: 50, description: "Kuenda namuchembere kumasango: an in-person journey with VaShava to the forest for sacred ritual work.", formats: ["in_person"], isAdult: false, isFixed: true },
        { id: 8, name: "Cleansing/Chenura", category: "Ancestral & Cleansing", price: 30, description: "Cleansing: kuchenurwa namuchembere, a full spiritual cleansing performed by VaShava.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
      ],
      products: [
        { id: 1, name: "Chenura/Cleanse", price: 20, description: "Kuvhura mhanza: opens the mind, clears bad spirits, opens work and relationships, cleanses the stomach." },
        { id: 2, name: "Ruva reMachembere", price: 20, description: "Reduces period pain and regulates your cycle: kuchenura chibereko." },
        { id: 3, name: "JayaGuru", price: 25, description: "Detoxes the male circulatory system, supports male vitality and rejuvenation, kusimbisa musana." },
        { id: 4, name: "Mutsvairo - Home Cleanse", price: 15, description: "Kudzinga mhepo/varoyi mumba: cleansing for new homes and business spaces, including homes with babies and children." },
      ],
      availability: { ...DEFAULT_AVAILABILITY },
      createdAt: new Date().toISOString(),
    };
  }

  // Loads every healer and appointment from Postgres into the in-memory
  // maps (write-through cache), or — with no database configured — falls
  // back to seeding VaShava in memory only, matching the app's original
  // behavior for local development.
  async initialize(): Promise<void> {
    if (!db) {
      const seed = this.vashavaSeed();
      const vashava: Healer = { id: this.healerIds++, ...seed };
      this.healers.set(vashava.id, vashava);
      return;
    }

    await ensureSchema();

    const healerRows = await db.select().from(healersTable);
    if (healerRows.length === 0) {
      const [inserted] = await db.insert(healersTable).values(this.vashavaSeed()).returning();
      healerRows.push(inserted);
    }
    for (const row of healerRows) {
      this.healers.set(row.id, row as Healer);
      this.healerIds = Math.max(this.healerIds, row.id + 1);
    }

    // One-time backfill: healers created before the country field existed
    // (namely VaShava, on databases from before this feature) have an empty
    // country. Fix hers specifically so she appears under Zimbabwe on the map.
    const vashava = this.healers.get(1);
    if (vashava && vashava.slug === "vashava" && !vashava.country) {
      const updated = { ...vashava, country: "zimbabwe" };
      this.healers.set(1, updated);
      await this.persistHealer(updated);
    }

    const aptRows = await db.select().from(appointmentsTable);
    for (const row of aptRows) {
      this.appointments.set(row.id, row as Appointment);
      this.appointmentIds = Math.max(this.appointmentIds, row.id + 1);
    }

    const leadRows = await db.select().from(leadsTable);
    for (const row of leadRows) {
      this.leads.set(row.id, row as Lead);
      this.leadIds = Math.max(this.leadIds, row.id + 1);
    }
  }

  // Write-through helpers: after the in-memory map is updated, mirror the
  // same row to Postgres when a database is configured. No-op otherwise
  // (pure in-memory mode for local dev without DATABASE_URL).
  private async persistHealer(healer: Healer): Promise<void> {
    if (!db) return;
    const { id, ...rest } = healer;
    await db.update(healersTable).set(rest).where(eq(healersTable.id, id));
  }

  private async persistAppointment(apt: Appointment): Promise<void> {
    if (!db) return;
    const { id, ...rest } = apt;
    await db.update(appointmentsTable).set(rest).where(eq(appointmentsTable.id, id));
  }

  // ---- Healers --------------------------------------------------------
  async getHealer(id: number): Promise<Healer | undefined> {
    return this.healers.get(id);
  }

  async getHealerBySlug(slug: string): Promise<Healer | undefined> {
    return Array.from(this.healers.values()).find(h => h.slug === slug.toLowerCase());
  }

  async getHealerByEmail(email: string): Promise<Healer | undefined> {
    return Array.from(this.healers.values()).find(h => h.email === email);
  }

  async createHealer(data: InsertHealer): Promise<Healer> {
    const base = {
      slug: data.slug.toLowerCase(),
      email: data.email,
      password: data.password,
      name: data.name,
      tagline: data.tagline ?? "",
      location: data.location ?? "",
      whatsapp: data.whatsapp,
      country: data.country.toLowerCase(),
      avatarUrl: "",
      headerImageUrl: DEFAULT_HEADER_IMAGES[this.healerIds % DEFAULT_HEADER_IMAGES.length],
      zinathaVerified: false,
      shopEnabled: true,
      readings: STARTER_READINGS.map((r, i) => ({ ...r, id: i + 1 })),
      products: STARTER_PRODUCTS.map((p, i) => ({ ...p, id: i + 1 })),
      availability: { ...DEFAULT_AVAILABILITY, blockedSlots: [] },
      createdAt: new Date().toISOString(),
    };
    let healer: Healer;
    if (db) {
      // Let Postgres assign the authoritative id (SERIAL), then mirror it
      // into the in-memory map so every other method keeps working unchanged.
      const [row] = await db.insert(healersTable).values(base).returning();
      healer = row as Healer;
    } else {
      healer = { id: this.healerIds++, ...base };
    }
    this.healers.set(healer.id, healer);
    this.healerIds = Math.max(this.healerIds, healer.id + 1);
    return healer;
  }

  // Public directory listing: deliberately returns full healer rows since
  // this in-memory store only holds public profile fields plus each
  // healer's OWN catalog; callers that render the directory only read the
  // public fields (slug/name/tagline/etc.), never another healer's
  // appointments, which live in a completely separate, healerId-scoped map.
  async listHealers(): Promise<Healer[]> {
    return Array.from(this.healers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateHealerProfile(id: number, updates: Partial<Pick<Healer, "name" | "tagline" | "location" | "whatsapp" | "avatarUrl" | "headerImageUrl" | "shopEnabled" | "country">>): Promise<Healer> {
    const healer = this.healers.get(id);
    if (!healer) throw new NotFoundError("Healer not found");
    const updated = { ...healer, ...updates };
    this.healers.set(id, updated);
    await this.persistHealer(updated);
    return updated;
  }

  async updateHealerCatalog(id: number, readings: Reading[], products: Product[]): Promise<Healer> {
    const healer = this.healers.get(id);
    if (!healer) throw new NotFoundError("Healer not found");
    const updated = { ...healer, readings, products };
    this.healers.set(id, updated);
    await this.persistHealer(updated);
    return updated;
  }

  // Clears one healer's appointments only. Exposed via a healer-only API
  // route, scoped to req.session.user.id, a healer can only ever reset
  // their own bookings, never another hub's.
  async resetAppointments(healerId: number): Promise<void> {
    for (const [id, apt] of this.appointments) {
      if (apt.healerId === healerId) this.appointments.delete(id);
    }
    if (db) {
      await db.delete(appointmentsTable).where(eq(appointmentsTable.healerId, healerId));
    }
  }

  async getAppointments(healerId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter(a => a.healerId === healerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAppointment(healerId: number, id: number): Promise<Appointment | undefined> {
    const apt = this.appointments.get(id);
    if (!apt || apt.healerId !== healerId) return undefined;
    return apt;
  }

  // True when an active appointment already occupies the slot containing
  // `iso`, scoped to a single healer's own bookings.
  private slotIsBooked(healerId: number, iso: string, ignoreId?: number): boolean {
    const cfg = this.availabilityFor(healerId);
    const start = new Date(iso).getTime();
    const end = start + cfg.slotMinutes * 60000;
    for (const apt of this.appointments.values()) {
      if (apt.healerId !== healerId) continue;
      if (apt.id === ignoreId) continue;
      if (!apt.datetime) continue;
      if (!OCCUPYING_STATUSES.includes(apt.status)) continue;
      const t = new Date(apt.datetime).getTime();
      if (t >= start && t < end) return true;
    }
    return false;
  }

  private availabilityFor(healerId: number): AvailabilityConfig {
    const healer = this.healers.get(healerId);
    if (!healer) throw new NotFoundError("Healer not found");
    return healer.availability ?? DEFAULT_AVAILABILITY;
  }

  // Validate that `iso` falls on an open, unblocked, free slot for this healer.
  private assertSlotBookable(healerId: number, iso: string) {
    const when = new Date(iso);
    if (isNaN(when.getTime())) throw new SlotUnavailableError("Invalid session time.");
    if (when.getTime() < Date.now()) throw new SlotUnavailableError("That time is in the past. Please pick another slot.");
    const { weekday, hour, dateStr, minute } = harareParts(when);
    const cfg = this.availabilityFor(healerId);
    if (!cfg.weekdays.includes(weekday)) throw new SlotUnavailableError("Not available on that day. Please pick another.");
    const totalMins = hour * 60 + minute;
    const openMins = cfg.startHour * 60;
    const closeMins = cfg.endHour * 60;
    if (totalMins < openMins || totalMins >= closeMins) throw new SlotUnavailableError("That time is outside working hours.");
    if ((totalMins - openMins) % cfg.slotMinutes !== 0) throw new SlotUnavailableError("That isn't a valid session start time. Please pick a slot from the calendar.");
    const canonical = slotIso(dateStr, hour, minute);
    if (cfg.blockedSlots.includes(canonical)) throw new SlotUnavailableError("That slot has been closed. Please pick another.");
    if (this.slotIsBooked(healerId, iso)) throw new SlotUnavailableError("That slot was just booked. Please choose another available time.");
  }

  async createAppointment(healerId: number, data: InsertAppointment): Promise<Appointment> {
    if (!this.healers.has(healerId)) throw new NotFoundError("Healer not found");
    if (data.format !== "async") {
      if (!data.datetime) throw new SlotUnavailableError("Please choose a session time before booking.");
      this.assertSlotBookable(healerId, data.datetime);
    }
    const base = {
      healerId,
      readingId: data.readingId ?? null,
      readingName: data.readingName,
      category: data.category,
      format: data.format,
      datetime: data.datetime ?? null,
      duration: data.duration ?? null,
      questionCount: data.questionCount ?? null,
      status: "pending_verification",
      whatsappNumber: data.whatsappNumber,
      paymentMethod: data.paymentMethod,
      paymentAmount: data.paymentAmount,
      paymentReference: data.paymentReference ?? null,
      clientName: data.clientName ?? null,
      intakeAnswers: data.intakeAnswers ?? null,
      sessionLink: null,
      createdAt: new Date().toISOString(),
    };
    let appointment: Appointment;
    if (db) {
      const [row] = await db.insert(appointmentsTable).values(base).returning();
      appointment = row as Appointment;
    } else {
      appointment = { id: this.appointmentIds++, ...base };
    }
    this.appointments.set(appointment.id, appointment);
    this.appointmentIds = Math.max(this.appointmentIds, appointment.id + 1);
    return appointment;
  }

  async updateAppointmentStatus(healerId: number, id: number, status: string, sessionLink?: string): Promise<Appointment> {
    const apt = this.appointments.get(id);
    if (!apt || apt.healerId !== healerId) throw new NotFoundError("Appointment not found");
    const updated: Appointment = { ...apt, status, sessionLink: sessionLink ?? apt.sessionLink };
    this.appointments.set(id, updated);
    await this.persistAppointment(updated);
    return updated;
  }

  async cancelAppointment(healerId: number, id: number): Promise<Appointment> {
    return this.updateAppointmentStatus(healerId, id, "cancelled");
  }

  // ---- Availability -------------------------------------------------------
  async getAvailability(healerId: number): Promise<AvailabilityConfig> {
    const cfg = this.availabilityFor(healerId);
    return { ...cfg, blockedSlots: [...cfg.blockedSlots] };
  }

  async updateAvailability(healerId: number, update: UpdateAvailability): Promise<AvailabilityConfig> {
    const healer = this.healers.get(healerId);
    if (!healer) throw new NotFoundError("Healer not found");
    const cfg = healer.availability ?? DEFAULT_AVAILABILITY;
    const next = { ...cfg, ...update };
    if (next.endHour <= next.startHour) {
      throw new SlotUnavailableError("End time must be after the start time.");
    }
    const updated = { ...healer, availability: next };
    this.healers.set(healerId, updated);
    await this.persistHealer(updated);
    return this.getAvailability(healerId);
  }

  async blockSlot(healerId: number, datetime: string): Promise<AvailabilityConfig> {
    const healer = this.healers.get(healerId);
    if (!healer) throw new NotFoundError("Healer not found");
    const when = new Date(datetime);
    if (isNaN(when.getTime())) throw new SlotUnavailableError("Invalid slot.");
    const { dateStr, hour, minute } = harareParts(when);
    const canonical = slotIso(dateStr, hour, minute);
    const cfg = healer.availability ?? DEFAULT_AVAILABILITY;
    if (!cfg.blockedSlots.includes(canonical)) {
      const next = { ...cfg, blockedSlots: [...cfg.blockedSlots, canonical] };
      const updated = { ...healer, availability: next };
      this.healers.set(healerId, updated);
      await this.persistHealer(updated);
    }
    return this.getAvailability(healerId);
  }

  async unblockSlot(healerId: number, datetime: string): Promise<AvailabilityConfig> {
    const healer = this.healers.get(healerId);
    if (!healer) throw new NotFoundError("Healer not found");
    const when = new Date(datetime);
    if (isNaN(when.getTime())) throw new SlotUnavailableError("Invalid slot.");
    const { dateStr, hour, minute } = harareParts(when);
    const canonical = slotIso(dateStr, hour, minute);
    const cfg = healer.availability ?? DEFAULT_AVAILABILITY;
    const next = { ...cfg, blockedSlots: cfg.blockedSlots.filter(s => s !== canonical) };
    const updated = { ...healer, availability: next };
    this.healers.set(healerId, updated);
    await this.persistHealer(updated);
    return this.getAvailability(healerId);
  }

  async getDaySlots(healerId: number, dateStr: string): Promise<DaySlot[]> {
    const cfg = this.availabilityFor(healerId);
    const weekday = harareParts(new Date(`${dateStr}T12:00:00+02:00`)).weekday;
    if (!cfg.weekdays.includes(weekday)) return [];

    const now = Date.now();
    const slots: DaySlot[] = [];
    const step = cfg.slotMinutes;
    for (let mins = cfg.startHour * 60; mins < cfg.endHour * 60; mins += step) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const iso = slotIso(dateStr, hour, minute);
      let status: SlotStatus;
      if (new Date(iso).getTime() < now) status = "past";
      else if (cfg.blockedSlots.includes(iso)) status = "closed";
      else if (this.slotIsBooked(healerId, iso)) status = "booked";
      else status = "available";
      slots.push({ datetime: iso, label: slotLabel(hour, minute), status });
    }
    return slots;
  }

  // ---- Interest form leads --------------------------------------------
  async createLead(data: InsertLead): Promise<Lead> {
    const base = {
      name: data.name,
      contact: data.contact,
      country: data.country ?? "",
      message: data.message ?? "",
      createdAt: new Date().toISOString(),
    };
    let lead: Lead;
    if (db) {
      const [row] = await db.insert(leadsTable).values(base).returning();
      lead = row as Lead;
    } else {
      lead = { id: this.leadIds++, ...base };
    }
    this.leads.set(lead.id, lead);
    this.leadIds = Math.max(this.leadIds, lead.id + 1);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const storage = new MemStorage();
