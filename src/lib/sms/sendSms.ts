import twilio from "twilio";

export async function sendSms(args: { to: string; body: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER; // E.164, e.g. +1602...

  if (!sid || !token || !from) {
    throw new Error(
      "Twilio env missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)",
    );
  }

  const client = twilio(sid, token);

  await client.messages.create({
    from,
    to: args.to,
    body: args.body,
  });
}
