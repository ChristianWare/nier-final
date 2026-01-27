/* eslint-disable @typescript-eslint/no-explicit-any */
import { BookingStatus } from "@prisma/client";
import { sendSms } from "@/lib/sms/sendSms";

type CustomerNotificationArgs = {
  status: BookingStatus;
  customerPhone: string;
  customerName: string;
  pickupAddress: string;
  driverName: string;
};

// Format phone to E.164 if not already
function formatPhoneE164(phone: string): string {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 1 and has 11 digits, assume US
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If already has +, return as-is
  if (phone.startsWith("+")) {
    return phone;
  }

  // Fallback: assume US
  return `+1${digits}`;
}

// Build notification message based on status
function buildCustomerMessage(args: CustomerNotificationArgs): string | null {
  const { status, customerName, pickupAddress, driverName } = args;

  const firstName = customerName.split(" ")[0] || "there";

  switch (status) {
    case BookingStatus.EN_ROUTE:
      return `Hi ${firstName}! ${driverName} is on the way to pick you up at ${pickupAddress}. You'll receive another text when they arrive. - Nier Transportation`;

    case BookingStatus.ARRIVED:
      return `Hi ${firstName}! ${driverName} has arrived at ${pickupAddress} and is waiting for you. - Nier Transportation`;

    case BookingStatus.COMPLETED:
      return `Thank you for riding with Nier Transportation, ${firstName}! We hope you had a great trip. See you next time!`;

    case BookingStatus.NO_SHOW:
      return `Hi ${firstName}, your driver waited at ${pickupAddress} but was unable to locate you. If you need to rebook, please contact us. - Nier Transportation`;

    // Don't send SMS for these statuses
    case BookingStatus.ASSIGNED:
    case BookingStatus.IN_PROGRESS:
    default:
      return null;
  }
}

export async function sendCustomerTripNotification(
  args: CustomerNotificationArgs,
): Promise<{ sent: boolean; error?: string }> {
  const { customerPhone } = args;

  if (!customerPhone) {
    return { sent: false, error: "No customer phone number" };
  }

  const message = buildCustomerMessage(args);

  if (!message) {
    // No message for this status - that's OK
    return { sent: false };
  }

  try {
    const formattedPhone = formatPhoneE164(customerPhone);

    await sendSms({
      to: formattedPhone,
      body: message,
    });

    console.log(
      `[CustomerNotification] Sent ${args.status} SMS to ${formattedPhone}`,
    );

    return { sent: true };
  } catch (err: any) {
    console.error(`[CustomerNotification] Failed to send SMS:`, err);
    return { sent: false, error: err?.message ?? "SMS send failed" };
  }
}

// Optional: Queue-based approach for reliability
// This creates a notification job that can be retried
export async function queueCustomerNotification(args: {
  bookingId: string;
  status: BookingStatus;
  customerPhone: string;
  customerName: string;
  pickupAddress: string;
  driverName: string;
}) {
  // For now, send directly
  // In production, you might want to use a job queue (Bull, etc.)
  return sendCustomerTripNotification({
    status: args.status,
    customerPhone: args.customerPhone,
    customerName: args.customerName,
    pickupAddress: args.pickupAddress,
    driverName: args.driverName,
  });
}
