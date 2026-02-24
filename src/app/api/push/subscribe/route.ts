// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/push/vapid";

// GET /api/push/subscribe — return VAPID public key
export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 },
    );
  }
}

// POST /api/push/subscribe — save a new subscription
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];
  const isAdminOrDriver = roles.includes("ADMIN") || roles.includes("DRIVER");

  if (!isAdminOrDriver) {
    return NextResponse.json(
      { error: "Push notifications are only available to admins and drivers" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys } = body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "Missing endpoint or keys" },
      { status: 400 },
    );
  }

  // Upsert by endpoint (one device can have one subscription)
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: session.user.id,
    },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ success: true });
}
