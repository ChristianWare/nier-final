import styles from "./Track.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "../../../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TrackPage({
  searchParams,
}: {
  searchParams?: { t?: string };
}) {
  const t = (searchParams?.t ?? "").trim();
  if (!t) {
    return (
      <main>
        <Nav background='white' />
        <LayoutWrapper>
          <section className={styles.container}>
            <div className={styles.card}>
              <h1 className={styles.title}>Track your request</h1>
              <p className={styles.subheading}>Missing tracking token.</p>
              <Link href='/book' className={styles.primary}>
                Back to booking
              </Link>
            </div>
          </section>
        </LayoutWrapper>
      </main>
    );
  }

  const booking = await db.booking.findFirst({
    where: { guestClaimToken: t },
    select: {
      id: true,
      status: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      createdAt: true,
      guestEmail: true,
      guestPhone: true,
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
    },
  });

  if (!booking) {
    return (
      <main>
        <Nav background='white' />
        <LayoutWrapper>
          <section className={styles.container}>
            <div className={styles.card}>
              <h1 className={styles.title}>Not found</h1>
              <p className={styles.subheading}>
                This tracking link is invalid or expired.
              </p>
              <Link href='/book' className={styles.primary}>
                Back to booking
              </Link>
            </div>
          </section>
        </LayoutWrapper>
      </main>
    );
  }

  const session = await auth();
  const isAuthed = Boolean(session?.user);

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>Request status</h1>
            <div className={styles.badge}>{booking.status}</div>

            <div className={styles.grid}>
              <div>
                <div className={styles.k}>Service</div>
                <div className={styles.v}>
                  {booking.serviceType?.name ?? "—"}
                </div>
              </div>
              <div>
                <div className={styles.k}>Vehicle</div>
                <div className={styles.v}>{booking.vehicle?.name ?? "—"}</div>
              </div>
              <div>
                <div className={styles.k}>Pickup</div>
                <div className={styles.v}>{booking.pickupAddress}</div>
              </div>
              <div>
                <div className={styles.k}>Dropoff</div>
                <div className={styles.v}>{booking.dropoffAddress}</div>
              </div>
            </div>

            <div className={styles.actions}>
              {!isAuthed ? (
                <>
                  <Link
                    href={`/register?next=${encodeURIComponent(`/book/track?t=${t}`)}`}
                    className={styles.primary}
                  >
                    Create an account to manage this request
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/book/track?t=${t}`)}`}
                    className={styles.secondary}
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <Link href='/account' className={styles.primary}>
                  Go to account
                </Link>
              )}
            </div>

            <div className={styles.note}>
              Dispatch will send a payment link after approval.
            </div>
          </div>
        </section>
      </LayoutWrapper>
    </main>
  );
}
