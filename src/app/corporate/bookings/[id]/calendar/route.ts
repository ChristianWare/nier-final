// GET /corporate/bookings/[id]/calendar: a company ride as an .ics file,
// for "Add to calendar". Only the company's own contacts can download it.

import { auth } from "../../../../../../auth";
import { db } from "@/lib/db";
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

  const contact = await db.corporateContact.findFirst({
    where: { userId },
    select: { corporateAccountId: true },
  });
  if (!contact) return new Response("Not found", { status: 404 });

  return rideIcsResponse(
    id,
    (b) => b.corporateAccountId === contact.corporateAccountId,
    (rideId) => `/corporate/bookings/${rideId}`,
  );
}
