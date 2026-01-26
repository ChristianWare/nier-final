/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from "@/lib/db";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import PaymentSuccessClient from "./Paymentsuccessclient";
import Button from "@/components/shared/Button/Button";
import styles from "./PaymentSuccess.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams?: Promise<{
    payment_intent?: string;
    redirect_status?: string;
    already_paid?: string;
  }>;
};

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: Props) {
  const { bookingId } = await params;
  const sp = (await searchParams) ?? {};
  const paymentIntentId = sp.payment_intent ?? null;
  const redirectStatus = sp.redirect_status ?? null;
  const alreadyPaid = sp.already_paid === "1";

  // Fetch booking details
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: {
        select: {
          status: true,
          amountPaidCents: true,
          amountTotalCents: true,
          paidAt: true,
        },
      },
    },
  });

  if (!booking) {
    return (
      <main>
        <Nav background='white' />
        <section className={styles.container}>
          <LayoutWrapper>
            <div className={styles.content}>
              <div className={styles.card}>
                <div className={styles.iconError}>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <line x1='15' y1='9' x2='9' y2='15' />
                    <line x1='9' y1='9' x2='15' y2='15' />
                  </svg>
                </div>
                <h1 className={styles.title}>Booking Not Found</h1>
                <p className={styles.subtitle}>
                  We couldn&#39;t find this booking. Please contact support if you
                  believe this is an error.
                </p>
                <div className={styles.actions}>
                  <Button href='/' text='Return Home' btnType='black' arrow />
                </div>
              </div>
            </div>
          </LayoutWrapper>
        </section>
      </main>
    );
  }

  const isPaid = booking.payment?.status === "PAID";
  const paymentFailed = redirectStatus === "failed";

  // Format date and time
  const pickupDate = booking.pickupAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const pickupTime = booking.pickupAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (paymentFailed) {
    return (
      <main>
        <Nav background='white' />
        <section className={styles.container}>
          <LayoutWrapper>
            <div className={styles.content}>
              <div className={styles.card}>
                <div className={styles.iconError}>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <line x1='15' y1='9' x2='9' y2='15' />
                    <line x1='9' y1='9' x2='15' y2='15' />
                  </svg>
                </div>
                <h1 className={styles.title}>Payment Failed</h1>
                <p className={styles.subtitle}>
                  Your payment could not be processed. Please try again or use a
                  different payment method.
                </p>
                <div className={styles.actions}>
                  <Button
                    href={`/pay/${bookingId}`}
                    text='Try Again'
                    btnType='black'
                    arrow
                  />
                  <Button href='/' text='Return Home' btnType='red' arrow />
                </div>
              </div>
            </div>
          </LayoutWrapper>
        </section>
      </main>
    );
  }

  return (
    <main>
      <Nav background='white' />
      <PaymentSuccessClient />
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={styles.content}>
            <div className={styles.card}>
              <div className={styles.iconSuccess}>
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                >
                  <path
                    d='M20 6L9 17l-5-5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>

              <h1 className={styles.title}>
                {alreadyPaid ? "Already Paid" : "Payment Successful!"}
              </h1>
              <p className={styles.subtitle}>
                {alreadyPaid
                  ? "This booking has already been paid. You're all set!"
                  : "Thank you for your payment. Your reservation is confirmed."}
              </p>

              <div className={styles.confirmationBox}>
                <div className={styles.confirmationHeader}>
                  <span className={styles.confirmationLabel}>
                    Confirmation Number
                  </span>
                  <span className={styles.confirmationId}>
                    {bookingId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className={styles.tripSummary}>
                <h2 className={styles.tripTitle}>Trip Details</h2>

                <div className={styles.tripRow}>
                  <div className={styles.tripIcon}>🚗</div>
                  <div className={styles.tripInfo}>
                    <span className={styles.tripLabel}>Service</span>
                    <span className={styles.tripValue}>
                      {booking.serviceType?.name} • {booking.vehicle?.name}
                    </span>
                  </div>
                </div>

                <div className={styles.tripRow}>
                  <div className={styles.tripIcon}>📅</div>
                  <div className={styles.tripInfo}>
                    <span className={styles.tripLabel}>Pickup Time</span>
                    <span className={styles.tripValue}>
                      {pickupDate} at {pickupTime}
                    </span>
                  </div>
                </div>

                <div className={styles.tripRow}>
                  <div className={styles.tripIcon}>📍</div>
                  <div className={styles.tripInfo}>
                    <span className={styles.tripLabel}>Pickup Location</span>
                    <span className={styles.tripValue}>
                      {booking.pickupAddress}
                    </span>
                  </div>
                </div>

                <div className={styles.tripRow}>
                  <div className={styles.tripIcon}>🏁</div>
                  <div className={styles.tripInfo}>
                    <span className={styles.tripLabel}>Dropoff Location</span>
                    <span className={styles.tripValue}>
                      {booking.dropoffAddress}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.nextSteps}>
                <h3 className={styles.nextStepsTitle}>What&#39;s Next?</h3>
                <ul className={styles.nextStepsList}>
                  <li>
                    A confirmation email has been sent to your email address
                  </li>
                  <li>Your driver will contact you before pickup</li>
                  <li>You can track your ride status in your dashboard</li>
                </ul>
              </div>

              <div className={styles.actions}>
                <Button
                  href='/dashboard'
                  text='Go to Dashboard'
                  btnType='black'
                  arrow
                />
                <Button
                  href='/book'
                  text='Book Another Ride'
                  btnType='red'
                  arrow
                />
              </div>

              <p className={styles.helpText}>
                Questions? Contact us at{" "}
                <a
                  href='mailto:support@niertransportation.com'
                  className={styles.helpLink}
                >
                  support@niertransportation.com
                </a>
              </p>
            </div>
          </div>
        </LayoutWrapper>
      </section>
    </main>
  );
}
