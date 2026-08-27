import {
  type User, type InsertUser, type Appointment, type InsertAppointment,
  type AvailabilityConfig, type UpdateAvailability, type DaySlot, type SlotStatus,
} from "@shared/schema";

// Thrown by createAppointment when the requested slot can't be booked.
export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
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

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string, sessionLink?: string): Promise<Appointment>;
  cancelAppointment(id: number): Promise<Appointment>;

  getAvailability(): Promise<AvailabilityConfig>;
  updateAvailability(update: UpdateAvailability): Promise<AvailabilityConfig>;
  blockSlot(datetime: string): Promise<AvailabilityConfig>;
  unblockSlot(datetime: string): Promise<AvailabilityConfig>;
  getDaySlots(dateStr: string): Promise<DaySlot[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private availability: AvailabilityConfig;
  private userIds = 1;
  private appointmentIds = 1;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.availability = {
      weekdays: [1, 2, 3, 4, 5, 6], // Mon–Sat open by default
      startHour: 9,
      endHour: 17,
      slotMinutes: 60,
      blockedSlots: [],
    };

    const healer: User = { id: this.userIds++, email: "vashava@vashava.com", password: "healer123", role: "healer" };
    this.users.set(healer.id, healer);

    this.seedAppointments();
  }

  private seedAppointments() {
    const now = Date.now();
    const mins = (m: number) => new Date(now + m * 60000).toISOString();
    const WA = "https://wa.me/263771234567";
    const seeds: Array<Partial<Appointment> & {
      readingName: string; category: string; format: string;
      whatsappNumber: string; paymentMethod: string; paymentAmount: number; status: string;
    }> = [
      // Live now — started 10 min ago, 45 min session
      { readingName: "Love & Relationships Reading", category: "love_relationships", format: "video",
        datetime: mins(-10), duration: 45, status: "confirmed", whatsappNumber: "263771112233",
        paymentMethod: "ecocash", paymentAmount: 45, paymentReference: "EC-88213", clientName: "Tariro M.", sessionLink: WA },
      // In session — healer already started
      { readingName: "Ancestral Guidance", category: "ancestors_spirit", format: "audio",
        datetime: mins(-5), duration: 30, status: "in_progress", whatsappNumber: "263772223344",
        paymentMethod: "innbucks", paymentAmount: 35, paymentReference: "IB-40192", clientName: "Kuda C.", sessionLink: WA },
      // Starting soon — in 8 min
      { readingName: "Career & Future Path", category: "guidance_future", format: "chat",
        datetime: mins(8), duration: 30, status: "confirmed", whatsappNumber: "263773334455",
        paymentMethod: "remitly", paymentAmount: 30, paymentReference: "RM-72845", clientName: "Rufaro D.", sessionLink: WA },
      // Upcoming — in 3 hours
      { readingName: "Spiritual Cleansing", category: "healing_wellbeing", format: "video",
        datetime: mins(180), duration: 60, status: "confirmed", whatsappNumber: "263774445566",
        paymentMethod: "world_remit", paymentAmount: 60, paymentReference: "WR-31002", clientName: "Nyasha P.", sessionLink: WA },
      // Pending verification — awaiting payment check
      { readingName: "Protection Spell Consultation", category: "spells_protection", format: "video",
        datetime: mins(1440), duration: 45, status: "pending_verification", whatsappNumber: "263775556677",
        paymentMethod: "ecocash", paymentAmount: 100, paymentReference: "EC-90551", clientName: "Farai G." },
      // Pending verification — async
      { readingName: "Written Tarot Spread", category: "guidance_future", format: "async",
        datetime: null, duration: null, status: "pending_verification", whatsappNumber: "263776667788",
        paymentMethod: "innbucks", paymentAmount: 25, paymentReference: "IB-55810", clientName: "Chipo Z." },
      // Completed — yesterday
      { readingName: "Office Visit — In Person", category: "live_in_person", format: "in_person",
        datetime: mins(-1440), duration: 60, status: "completed", whatsappNumber: "263777778899",
        paymentMethod: "ecocash", paymentAmount: 80, paymentReference: "EC-11920", clientName: "Tendai R.",
        sessionLink: "VaShava's Studio, 14 Borrowdale Rd, Harare — address confirmed via WhatsApp." },
      // Completed — last week
      { readingName: "Healing & Wellbeing Session", category: "healing_wellbeing", format: "audio",
        datetime: mins(-10080), duration: 30, status: "completed", whatsappNumber: "263778889900",
        paymentMethod: "remitly", paymentAmount: 35, paymentReference: "RM-60417", clientName: "Memory K.", sessionLink: WA },
    ];

    seeds.forEach(s => {
      const id = this.appointmentIds++;
      this.appointments.set(id, {
        id,
        readingId: null,
        readingName: s.readingName,
        category: s.category,
        format: s.format,
        datetime: s.datetime ?? null,
        duration: s.duration ?? null,
        questionCount: null,
        status: s.status,
        whatsappNumber: s.whatsappNumber,
        paymentMethod: s.paymentMethod,
        paymentAmount: s.paymentAmount,
        paymentReference: s.paymentReference ?? null,
        clientName: s.clientName ?? null,
        intakeAnswers: null,
        sessionLink: s.sessionLink ?? null,
        createdAt: new Date(now - this.appointmentIds * 60000).toISOString(),
      });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIds++;
    const user: User = { id, email: insertUser.email, password: insertUser.password, role: insertUser.role ?? "client" };
    this.users.set(id, user);
    return user;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  // True when an active appointment already occupies the slot containing `iso`.
  private slotIsBooked(iso: string, ignoreId?: number): boolean {
    const start = new Date(iso).getTime();
    const end = start + this.availability.slotMinutes * 60000;
    for (const apt of this.appointments.values()) {
      if (apt.id === ignoreId) continue;
      if (!apt.datetime) continue;
      if (!OCCUPYING_STATUSES.includes(apt.status)) continue;
      const t = new Date(apt.datetime).getTime();
      if (t >= start && t < end) return true;
    }
    return false;
  }

  // Validate that `iso` falls on an open, unblocked, free slot.
  private assertSlotBookable(iso: string) {
    const when = new Date(iso);
    if (isNaN(when.getTime())) throw new SlotUnavailableError("Invalid session time.");
    if (when.getTime() < Date.now()) throw new SlotUnavailableError("That time is in the past — please pick another slot.");
    const { weekday, hour, dateStr, minute } = harareParts(when);
    const cfg = this.availability;
    if (!cfg.weekdays.includes(weekday)) throw new SlotUnavailableError("VaShava isn't available on that day. Please pick another.");
    // Must land exactly on a generated slot boundary within working hours.
    const totalMins = hour * 60 + minute;
    const openMins = cfg.startHour * 60;
    const closeMins = cfg.endHour * 60;
    if (totalMins < openMins || totalMins >= closeMins) throw new SlotUnavailableError("That time is outside VaShava's working hours.");
    if ((totalMins - openMins) % cfg.slotMinutes !== 0) throw new SlotUnavailableError("That isn't a valid session start time. Please pick a slot from the calendar.");
    const canonical = slotIso(dateStr, hour, minute);
    if (cfg.blockedSlots.includes(canonical)) throw new SlotUnavailableError("That slot has been closed. Please pick another.");
    if (this.slotIsBooked(iso)) throw new SlotUnavailableError("That slot was just booked. Please choose another available time.");
  }

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    // Scheduled (non-async) sessions must land on a free, open slot.
    if (data.format !== "async") {
      if (!data.datetime) throw new SlotUnavailableError("Please choose a session time before booking.");
      this.assertSlotBookable(data.datetime);
    }
    const id = this.appointmentIds++;
    const appointment: Appointment = {
      id,
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
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointmentStatus(id: number, status: string, sessionLink?: string): Promise<Appointment> {
    const apt = this.appointments.get(id);
    if (!apt) throw new Error("Appointment not found");
    const updated: Appointment = { ...apt, status, sessionLink: sessionLink ?? apt.sessionLink };
    this.appointments.set(id, updated);
    return updated;
  }

  async cancelAppointment(id: number): Promise<Appointment> {
    return this.updateAppointmentStatus(id, "cancelled");
  }

  // ---- Availability -------------------------------------------------------
  async getAvailability(): Promise<AvailabilityConfig> {
    return { ...this.availability, blockedSlots: [...this.availability.blockedSlots] };
  }

  async updateAvailability(update: UpdateAvailability): Promise<AvailabilityConfig> {
    const next = { ...this.availability, ...update };
    if (next.endHour <= next.startHour) {
      throw new SlotUnavailableError("End time must be after the start time.");
    }
    this.availability = next;
    return this.getAvailability();
  }

  async blockSlot(datetime: string): Promise<AvailabilityConfig> {
    const when = new Date(datetime);
    if (isNaN(when.getTime())) throw new SlotUnavailableError("Invalid slot.");
    const { dateStr, hour, minute } = harareParts(when);
    const canonical = slotIso(dateStr, hour, minute);
    if (!this.availability.blockedSlots.includes(canonical)) {
      this.availability.blockedSlots.push(canonical);
    }
    return this.getAvailability();
  }

  async unblockSlot(datetime: string): Promise<AvailabilityConfig> {
    const when = new Date(datetime);
    if (isNaN(when.getTime())) throw new SlotUnavailableError("Invalid slot.");
    const { dateStr, hour, minute } = harareParts(when);
    const canonical = slotIso(dateStr, hour, minute);
    this.availability.blockedSlots = this.availability.blockedSlots.filter(s => s !== canonical);
    return this.getAvailability();
  }

  async getDaySlots(dateStr: string): Promise<DaySlot[]> {
    const cfg = this.availability;
    // Derive the weekday of this calendar date in Harare time.
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
      else if (this.slotIsBooked(iso)) status = "booked";
      else status = "available";
      slots.push({ datetime: iso, label: slotLabel(hour, minute), status });
    }
    return slots;
  }
}

export const storage = new MemStorage();
