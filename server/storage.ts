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
  resetAppointments(): void;

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
  }

  // Clears all appointments. Exposed via a healer-only API route so the
  // practitioner can wipe test/demo bookings from the dashboard themselves.
  resetAppointments() {
    this.appointments.clear();
    this.appointmentIds = 1;
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
