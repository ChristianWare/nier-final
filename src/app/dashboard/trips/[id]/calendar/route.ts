// GET /dashboard/trips/[id]/calendar: the ride as an .ics file, for "Add to
// calendar" (Apple Calendar, Outlook, most phones). Only the person who
// booked the ride can download it.

import { auth } from "../../../../../../auth";
import { rideIcsResponse } from "@/lib/rideIcsResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return new Response("Not signed in", { status: 401 });

  return rideIcsResponse(
    id,
    (b) => b.userId === userId,
    (rideId) => `/dashboard/trips/${rideId}`,
  );
}
