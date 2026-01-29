/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  // Log what we have (masked for security)
  console.log("Twilio Config:");
  console.log(
    "  SID:",
    sid ? `${sid.slice(0, 6)}...${sid.slice(-4)}` : "MISSING",
  );
  console.log("  Token:", token ? `${token.slice(0, 4)}...` : "MISSING");
  console.log("  From:", from || "MISSING");

  if (!sid || !token || !from) {
    return NextResponse.json({
      error: "Missing Twilio env vars",
      has: { sid: !!sid, token: !!token, from: !!from },
    });
  }

  // Replace with YOUR phone number to test
  const testTo = "+19177691192"; // ← PUT YOUR PHONE NUMBER HERE

  try {
    const client = twilio(sid, token);

    const message = await client.messages.create({
      from,
      to: testTo,
      body: "Test SMS from Nier Transportation 🚗",
    });

    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
    });
  } catch (error: any) {
    console.error("Twilio Error:", error);

    return NextResponse.json({
      error: "Twilio send failed",
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo,
      status: error.status,
    });
  }
}
