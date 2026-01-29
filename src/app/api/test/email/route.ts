/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ||
    "Nier Transportation <no-reply@niertransportation.com>";

  console.log("Email Config:");
  console.log("  API Key:", apiKey ? `${apiKey.slice(0, 8)}...` : "MISSING");
  console.log("  From:", from);

  if (!apiKey) {
    return NextResponse.json({
      error: "Missing RESEND_API_KEY env var",
    });
  }

  // Replace with YOUR email to test
  const testTo = "chris.ware.dev@gmail.com"; // Your email

  try {
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to: testTo,
      subject: "Test Email from Nier Transportation 🚗",
      text: "If you're reading this, email notifications are working!",
    });

    console.log("Resend result:", result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Resend Error:", error);

    return NextResponse.json({
      error: "Email send failed",
      message: error.message,
      name: error.name,
    });
  }
}
