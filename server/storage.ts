import {
  type Healer, type InsertHealer, type Appointment, type InsertAppointment,
  type AvailabilityConfig, type UpdateAvailability, type DaySlot, type SlotStatus,
  type Lead, type InsertLead, type Feedback, type InsertFeedback, type Visit,
  healers as healersTable, appointments as appointmentsTable, leads as leadsTable, feedback as feedbackTable, visits as visitsTable,
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

  // Trial-user feedback — open-ended suggestions, separate from leads.
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  listFeedback(): Promise<Feedback[]>;

  // Visit tracking — city/country and rough duration for demo hubs and
  // marketing pages, via a start call plus periodic heartbeats.
  startVisit(path: string, city: string, country: string): Promise<Visit>;
  heartbeatVisit(id: number): Promise<void>;
  listVisits(): Promise<Visit[]>;
}

// A small rotation of nature/heritage images given to new hubs as a starting
// header photo. Each healer can replace it any time from Hub Settings.
const DEFAULT_HEADER_IMAGES = ["/images/default-header-1.jpg", "/images/default-header-2.jpg", "/images/default-header-3.jpg"];

export class MemStorage implements IStorage {
  private healers: Map<number, Healer>;
  private appointments: Map<number, Appointment>;
  private leads: Map<number, Lead> = new Map();
  private feedback: Map<number, Feedback> = new Map();
  private visits: Map<number, Visit> = new Map();
  private healerIds = 1;
  private appointmentIds = 1;
  private leadIds = 1;
  private feedbackIds = 1;
  private visitIds = 1;

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

  // Elliestrator Botanica's real catalog, extracted from her WhatsApp
  // Business profile and onboarded as the platform's second hub.
  private elliestratorSeed(): Omit<Healer, "id"> {
    return {
      slug: "elliestrator-botanica",
      email: "ellie@ellie.com",
      password: "botanica123",
      name: "Elliestrator Botanica",
      tagline: "Bold Rituals for Real Life",
      location: "Zimbabwe",
      whatsapp: "263783402890",
      country: "zimbabwe",
      avatarUrl: "/images/elliestrator-avatar.jpg",
      headerImageUrl: "/images/elliestrator-header.jpg",
      zinathaVerified: true,
      shopEnabled: true,
      readings: [
        { id: 1, name: "Getting To Know Yourself", category: "Tarot & Card Readings", price: 80, description: "Keys to self-discovery: what makes you unique, how to unlock your magical powers, your creativity, and your compassion.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 2, name: "A Spread for Honesty with Yourself", category: "Tarot & Card Readings", price: 50, description: "An honest look at where you stand with yourself right now.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 3, name: "The Next Few Months", category: "Tarot & Card Readings", price: 60, description: "A predictive spread looking ahead at what's coming.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 4, name: "1 Question Reading", category: "Tarot & Card Readings", price: 15, description: "A focused one-card reading for one direct question.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 5, name: "Gifts From Ancestors", category: "Tarot & Card Readings", price: 60, description: "Looking at the gifts you carry from your ancestors and how to honor them.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 6, name: "Nightmare Spread", category: "Tarot & Card Readings", price: 50, description: "Had a nightmare and think it means something? This spread digs into it.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 7, name: "Dream Interpretation Spread", category: "Tarot & Card Readings", price: 40, description: "Figuring out the signs you're being given through your dreams.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false, customIntake: [{ field: "dream", label: "Describe your dream in as much detail as possible" }] },
        { id: 8, name: "Healing A Toxic Workplace Spread", category: "Tarot & Card Readings", price: 60, description: "Understand the root of a difficult work environment and how to protect your peace there.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 9, name: "Stress-Check Spread", category: "Tarot & Card Readings", price: 40, description: "Helps you put a name to why you're feeling so stressed right now.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 10, name: "General Love Reading", category: "Tarot & Card Readings", price: 40, description: "An in-depth general love reading.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 11, name: "Spirit Guide Reading", category: "Tarot & Card Readings", price: 50, description: "Connect to your spirit guide and find out who they are.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 12, name: "How To Face Your Fears", category: "Tarot & Card Readings", price: 45, description: "Designed to help you face something you've been avoiding.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 13, name: "Why Can't I Find My Love?", category: "Tarot & Card Readings", price: 50, description: "What's getting in the way of you settling into love.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 14, name: "Going Through A Career Shift?", category: "Tarot & Card Readings", price: 70, description: "What you should be doing in your career right now.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 15, name: "Attracting A Healthy Relationship", category: "Tarot & Card Readings", price: 60, description: "How you can attract a healthy relationship.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 16, name: "Career Card Reading", category: "Tarot & Card Readings", price: 50, description: "A career reading to help align you with your path.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 17, name: "Why Am I So Insecure?", category: "Tarot & Card Readings", price: 50, description: "How to get past insecurities.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 18, name: "Couples Reading (1hr Each)", category: "Tarot & Card Readings", price: 300, description: "One hour of reading time for each person in the couple.", formats: ["video", "audio"], isAdult: false, isFixed: true },
        { id: 19, name: "Boosting Your Intimate Side", category: "Intimacy & Relationships", price: 40, description: "Tips to help you feel more confident and adventurous with your partner.", formats: ["video", "audio", "chat", "async"], isAdult: true, isFixed: false },
        { id: 20, name: "Love Spells", category: "Spells & Rituals", price: 120, description: "A spell to help draw love toward you.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 21, name: "Cord Cutting Ritual", category: "Spells & Rituals", price: 120, description: "Releases lingering energetic ties to a person or situation.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 22, name: "Remove 3rd Party", category: "Spells & Rituals", price: 120, description: "A powerful breakup spell to remove a third party from a relationship.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 23, name: "Stop F*ing Around", category: "Spells & Rituals", price: 100, description: "For when you want a partner to commit and stop stringing you along.", formats: ["video", "audio", "chat", "async"], isAdult: true, isFixed: false },
        { id: 24, name: "Leave Me Alone / Banishing Spell", category: "Spells & Rituals", price: 100, description: "A banishing spell to make someone leave you alone for good.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 25, name: "Protection Spell", category: "Spells & Rituals", price: 100, description: "For when you're feeling vulnerable or threatened and need spiritual protection.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
        { id: 26, name: "Red Hot Intimacy", category: "Spells & Rituals", price: 120, description: "For igniting passion and intimacy with someone you have your sights set on.", formats: ["video", "audio", "chat", "async"], isAdult: true, isFixed: false },
        { id: 27, name: "Shut Them Up", category: "Spells & Rituals", price: 120, description: "Intended to silence gossip and negative talk about you.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
      ],
      products: [
        { id: 1, name: "Evil Eye Bracelet", price: 10, description: "Protection from negative energy and jealousy." },
        { id: 2, name: "Carnelian Bracelet", price: 10, description: "Passion, courage, and protection." },
        { id: 3, name: "Black Tourmaline Bracelet", price: 10, description: "Crystals are able to absorb and release energy." },
        { id: 4, name: "Rose Quartz Bracelet", price: 10, description: "Believed to offer several benefits for love and self-compassion." },
        { id: 5, name: "Citrine Bracelet", price: 20, description: "To attract abundance and luck." },
        { id: 6, name: "Pure Loban", price: 10, description: "For spiritual and energetic cleansing uses." },
        { id: 7, name: "Lapis Lazuli Crystal Bracelet", price: 20, description: "Crystals are able to absorb and release energy." },
        { id: 8, name: "White Howlite Bracelet", price: 15, description: "Crystals are able to absorb and release energy." },
        { id: 9, name: "Moonstone Bracelet", price: 10, description: "Crystals are able to absorb and release energy." },
        { id: 10, name: "Moss Agate Bracelet", price: 10, description: "Crystals are able to absorb and release energy." },
        { id: 11, name: "Amethyst Crystal Bracelet", price: 15, description: "Can be beaded or chipped." },
        { id: 12, name: "Tiger's Eye Bracelet", price: 10, description: "100% authentic crystals." },
        { id: 13, name: "Custom Crystal Bracelet", price: 20, description: "Build your own — 100% authentic crystals." },
        { id: 14, name: "Turquoise Crystal Bracelet", price: 15, description: "Crystals are able to absorb and release energy." },
        { id: 15, name: "Gimme All Tha Love", price: 15, description: "Aura cleanser: helps with self-love and attracting or protecting relationships." },
        { id: 16, name: "Bring In Tha Money", price: 15, description: "Aura cleanser for business luck and closing deals." },
        { id: 17, name: "Vibe Spotless & Sparkling", price: 20, description: "Aura cleanser to help clear out bad energy." },
        { id: 18, name: "Honeypot Yoni Oil", price: 10, description: "Feminine intimate wellness oil." },
        { id: 19, name: "Silky Kola Syrup", price: 15, description: "A popular aphrodisiac syrup." },
        { id: 20, name: "Buzzz Syrup", price: 15, description: "Helps with stamina and performance." },
        { id: 21, name: "Main Character Domination Oil", price: 30, description: "For stepping into your confidence and taking control." },
        { id: 22, name: "Road Opener Oil", price: 15, description: "Clears the path ahead of obstacles." },
        { id: 23, name: "Back To Sender Oil", price: 20, description: "A protective oil to send negative energy back to its source." },
      ],
      availability: { ...DEFAULT_AVAILABILITY },
      createdAt: new Date().toISOString(),
    };
  }


  async initialize(): Promise<void> {
    if (!db) {
      const seed = this.vashavaSeed();
      const vashava: Healer = { id: this.healerIds++, ...seed };
      this.healers.set(vashava.id, vashava);
      const ellieSeed = this.elliestratorSeed();
      const ellie: Healer = { id: this.healerIds++, ...ellieSeed };
      this.healers.set(ellie.id, ellie);
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

    // One-time onboarding: add Elliestrator Botanica as the platform's
    // second hub if she isn't already in the database (idempotent — safe
    // to run on every startup, only inserts once).
    const hasEllie = Array.from(this.healers.values()).some(h => h.slug === "elliestrator-botanica");
    if (!hasEllie) {
      const [inserted] = await db.insert(healersTable).values(this.elliestratorSeed()).returning();
      const ellie = inserted as Healer;
      this.healers.set(ellie.id, ellie);
      this.healerIds = Math.max(this.healerIds, ellie.id + 1);
    }

    // One-time correction: Elliestrator Botanica was first seeded with a
    // placeholder gmail address and no ZINATHA badge; bring an
    // already-seeded record up to date with the corrected values.
    const ellieEntry = Array.from(this.healers.entries()).find(([, h]) => h.slug === "elliestrator-botanica");
    if (ellieEntry) {
      const [ellieId, ellie] = ellieEntry;
      if (ellie.email !== "ellie@ellie.com" || !ellie.zinathaVerified) {
        const updated = { ...ellie, email: "ellie@ellie.com", zinathaVerified: true };
        this.healers.set(ellieId, updated);
        await this.persistHealer(updated);
      }
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

    const feedbackRows = await db.select().from(feedbackTable);
    for (const row of feedbackRows) {
      this.feedback.set(row.id, row as Feedback);
      this.feedbackIds = Math.max(this.feedbackIds, row.id + 1);
    }

    const visitRows = await db.select().from(visitsTable);
    for (const row of visitRows) {
      this.visits.set(row.id, row as Visit);
      this.visitIds = Math.max(this.visitIds, row.id + 1);
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
      email: data.email,
      whatsapp: data.whatsapp,
      createdAt: new Date().toISOString(),
    };
    let lead: Lead;
    if (db) {
      const [row] = await db.insert(leadsTable).values(base).returning();
      lead = row as Lead;
    } else {
      lead = { id: this.leadIds++, contact: "", country: "", message: "", ...base };
    }
    this.leads.set(lead.id, lead);
    this.leadIds = Math.max(this.leadIds, lead.id + 1);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ---- Trial-user feedback ---------------------------------------------
  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const base = {
      name: data.name ?? "",
      message: data.message,
      createdAt: new Date().toISOString(),
    };
    let entry: Feedback;
    if (db) {
      const [row] = await db.insert(feedbackTable).values(base).returning();
      entry = row as Feedback;
    } else {
      entry = { id: this.feedbackIds++, ...base };
    }
    this.feedback.set(entry.id, entry);
    this.feedbackIds = Math.max(this.feedbackIds, entry.id + 1);
    return entry;
  }

  async listFeedback(): Promise<Feedback[]> {
    return Array.from(this.feedback.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ---- Visit tracking ----------------------------------------------------
  async startVisit(path: string, city: string, country: string): Promise<Visit> {
    const now = new Date().toISOString();
    const base = { path, city, country, startedAt: now, lastSeenAt: now };
    let visit: Visit;
    if (db) {
      const [row] = await db.insert(visitsTable).values(base).returning();
      visit = row as Visit;
    } else {
      visit = { id: this.visitIds++, ...base };
    }
    this.visits.set(visit.id, visit);
    this.visitIds = Math.max(this.visitIds, visit.id + 1);
    return visit;
  }

  async heartbeatVisit(id: number): Promise<void> {
    const visit = this.visits.get(id);
    if (!visit) return;
    const updated = { ...visit, lastSeenAt: new Date().toISOString() };
    this.visits.set(id, updated);
    if (db) {
      await db.update(visitsTable).set({ lastSeenAt: updated.lastSeenAt }).where(eq(visitsTable.id, id));
    }
  }

  async listVisits(): Promise<Visit[]> {
    return Array.from(this.visits.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
}

export const storage = new MemStorage();
