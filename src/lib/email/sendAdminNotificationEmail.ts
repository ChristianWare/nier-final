import { Resend } from "resend";

export async function sendAdminNotificationEmail(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    // RESEND_FROM first: it's the verified sender every other email uses.
    // EMAIL_FROM is a leftover that pointed at an unverified subdomain.
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    "Nier Transportation <no-reply@niertransportation.com>";

  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    ...(args.html && { html: args.html }),
  });
}
