// niertransportation.com/review: a short link to leave a Google review, for
// QR codes on seat-back cards, business cards and receipts. It sends people
// to GOOGLE_REVIEW_URL (the same link the review-request texts use), or to
// the homepage until that's set.

import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export function GET() {
  const target = (process.env.GOOGLE_REVIEW_URL ?? "").trim();
  const url = /^https:\/\//i.test(target) ? target : `${SITE_URL}/`;
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
  });
}
