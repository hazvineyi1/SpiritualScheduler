import { type User, type InsertUser, type Appointment, type InsertAppointment } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string, sessionLink?: string): Promise<Appointment>;
  cancelAppointment(id: number): Promise<Appointment>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private userIds = 1;
  private appointmentIds = 1;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();

    const healer: User = { id: this.userIds++, email: "ellie@elliestratorbotanica.com", password: "healer123", role: "healer" };
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
        sessionLink: "Ellie's Studio, 14 Borrowdale Rd, Harare — address confirmed via WhatsApp." },
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

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
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
}

export const storage = new MemStorage();
