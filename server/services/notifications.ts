import { type Payment, type Appointment } from "@shared/schema";

// Interface for SMS providers
export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<void>;
}

// Placeholder SMS provider that logs messages for development
export class LoggingSMSProvider implements SMSProvider {
  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[SMS Notification] To: ${to}, Message: ${message}`);
  }
}

// SMS Notification Service
export class NotificationService {
  private smsProvider: SMSProvider;

  constructor(smsProvider: SMSProvider = new LoggingSMSProvider()) {
    this.smsProvider = smsProvider;
  }

  async sendPaymentConfirmation(payment: Payment, appointment: Appointment) {
    const message = this.generatePaymentConfirmationMessage(payment, appointment);
    await this.smsProvider.sendSMS(appointment.phoneNumber, message);
  }

  private generatePaymentConfirmationMessage(payment: Payment, appointment: Appointment): string {
    const formattedDate = new Date(appointment.datetime).toLocaleDateString('en-ZW', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `Payment Confirmed!\n\n` +
           `Your spiritual consultation is confirmed for ${formattedDate}.\n\n` +
           `Details:\n` +
           `- Reference: ${payment.reference}\n` +
           `- Amount: $${payment.amount} ${payment.currency}\n` +
           `- Type: ${appointment.type}\n\n` +
           `Please arrive 10 minutes before your scheduled time.`;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();