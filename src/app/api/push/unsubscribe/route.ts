// app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";

// POST /api/push/unsubscribe — remove a subscription
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = body as { endpoint?: string };

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  // Only delete if it belongs to this user
  await db.pushSubscription
    .deleteMany({
      where: {
        endpoint,
        userId: session.user.id,
      },
    })
    .catch(() => null);

  return NextResponse.json({ success: true });
}
