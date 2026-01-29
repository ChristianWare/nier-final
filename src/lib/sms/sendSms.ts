import twilio from "twilio";

export async function sendSms(args: {
  to: string;
  body: string;
  from?: string; // Optional override - uses env default if not provided
}) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const defaultFrom = process.env.TWILIO_FROM_NUMBER; // Fallback

  if (!sid || !token) {
    throw new Error(
      "Twilio env missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)",
    );
  }

  // Use provided "from" number, or fall back to env default
  const from = args.from || defaultFrom;

  if (!from) {
    throw new Error(
      "No SMS from number provided. Set TWILIO_FROM_NUMBER or pass 'from' parameter.",
    );
  }

  const client = twilio(sid, token);

  await client.messages.create({
    from,
    to: args.to,
    body: args.body,
  });
}
