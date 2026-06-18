import { type User, type InsertUser, type Appointment, type InsertAppointment, type Payment, type InsertPayment } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Appointment operations
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: number): Promise<Appointment[]>;
  getAppointmentsByDateRange(start: Date, end: Date): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment>;

  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByAppointment(appointmentId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string): Promise<Payment>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private payments: Map<number, Payment>;
  private currentIds: { users: number; appointments: number; payments: number };

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.payments = new Map();
    this.currentIds = { users: 1, appointments: 1, payments: 1 };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Appointment operations
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentsByClient(clientId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (apt) => apt.clientId === clientId,
    );
  }

  async getAppointmentsByDateRange(start: Date, end: Date): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter((apt) => {
      const aptDate = new Date(apt.datetime);
      return aptDate >= start && aptDate <= end;
    });
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentIds.appointments++;
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      datetime: new Date(insertAppointment.datetime),
      status: "pending",
      paymentStatus: "pending",
      practitionerNotes: null,
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment> {
    const appointment = this.appointments.get(id);
    if (!appointment) throw new Error("Appointment not found");

    const updated = { ...appointment, status };
    this.appointments.set(id, updated);
    return updated;
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByAppointment(appointmentId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.appointmentId === appointmentId,
    );
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentIds.payments++;
    const payment: Payment = {
      ...insertPayment,
      id,
      status: "pending",
      reference: insertPayment.reference || null
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment> {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("Payment not found");

    const updated = { ...payment, status };
    this.payments.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();