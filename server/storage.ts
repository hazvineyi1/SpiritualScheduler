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
