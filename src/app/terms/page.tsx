import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { SITE_URL } from "@/lib/site";
import styles from "./LegalPage.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Nier Transportation",
  description:
    "The terms that govern bookings and use of Nier Transportation's chauffeured transportation services across Phoenix, Scottsdale, and Arizona.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <main>
      <Nav background='white' />
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={styles.content}>
            <h1 className={`${styles.heading} h1`}>Terms of Service</h1>
            <p className={styles.updated}>Effective date: July 29, 2026</p>

            <p className={styles.copy}>
              These Terms of Service (&quot;Terms&quot;) govern your use of the
              Nier Transportation website and your booking and use of our
              chauffeured transportation services. By making a reservation or
              using this site, you agree to these Terms.
            </p>

            <h2 className={styles.sectionTitle}>1. Our Services</h2>
            <p className={styles.copy}>
              Nier Transportation provides licensed, chauffeured ground
              transportation across Metro Phoenix and Arizona, including airport
              transfers, corporate travel, weddings and events, hourly charters,
              and long-distance point-to-point service. Service availability,
              vehicles, and rates are confirmed at the time of booking.
            </p>

            <h2 className={styles.sectionTitle}>2. Bookings &amp; Payment</h2>
            <p className={styles.copy}>
              Rates are quoted before you confirm your reservation. Unless
              stated otherwise in your confirmation, quoted rates are flat rates
              for the itinerary described at booking; changes to the itinerary
              (additional stops, wait time beyond the included grace period,
              route changes) may adjust the final total. Payments are processed
              securely by our third-party payment processor; full card numbers
              are never stored on our servers.
            </p>

            <h2 className={styles.sectionTitle}>
              3. Cancellations &amp; Changes
            </h2>
            <p className={styles.copy}>
              Cancellation and change terms are provided at the time of booking
              and restated in your reservation confirmation. To cancel or modify
              a reservation, use your account dashboard or contact us at (480)
              300-6003 as early as possible. Late cancellations and no-shows may
              be charged in accordance with the terms in your confirmation.
            </p>

            <h2 className={styles.sectionTitle}>
              4. Flight Tracking &amp; Delays
            </h2>
            <p className={styles.copy}>
              For airport pickups, we track your flight and adjust chauffeur
              timing to actual arrival at no extra charge. For all services, we
              are not liable for delays caused by events beyond our reasonable
              control, including weather, road closures, accidents, airport
              operations, or other force majeure events, though we will always
              work to minimize their impact on your trip.
            </p>

            <h2 className={styles.sectionTitle}>5. Passenger Conduct</h2>
            <p className={styles.copy}>
              Smoking and vaping are not permitted in any vehicle. Passengers
              are responsible for damage to the vehicle beyond normal wear
              caused by their party. Passenger counts may not exceed the
              vehicle&apos;s stated capacity, and children must be secured in
              appropriate child restraints as required by Arizona law — please
              note car seat needs when booking. We reserve the right to refuse
              or terminate service, without refund, where continued service
              would be unsafe or unlawful.
            </p>

            <h2 className={styles.sectionTitle}>
              6. Accounts &amp; Corporate Billing
            </h2>
            <p className={styles.copy}>
              You are responsible for the accuracy of information on your
              account and for activity that occurs under it. Corporate accounts
              are additionally governed by the billing terms agreed when the
              account is established.
            </p>

            <h2 className={styles.sectionTitle}>7. Limitation of Liability</h2>
            <p className={styles.copy}>
              To the fullest extent permitted by law, Nier Transportation's
              total liability arising out of any booking or use of this site is
              limited to the amount paid for the affected reservation. Nothing
              in these Terms limits liability that cannot be limited under
              applicable law.
            </p>

            <h2 className={styles.sectionTitle}>8. Website Content</h2>
            <p className={styles.copy}>
              Content on this site is provided for general information about our
              services and may be updated at any time. All site content,
              branding, and imagery are the property of Nier Transportation or
              its licensors and may not be reused without permission.
            </p>

            <h2 className={styles.sectionTitle}>9. Governing Law</h2>
            <p className={styles.copy}>
              These Terms are governed by the laws of the State of Arizona. Any
              disputes will be resolved in the state or federal courts located
              in Maricopa County, Arizona.
            </p>

            <h2 className={styles.sectionTitle}>10. Changes to These Terms</h2>
            <p className={styles.copy}>
              We may update these Terms from time to time. The effective date
              above reflects the latest revision, and continued use of the site
              or our services after an update constitutes acceptance of the
              revised Terms.
            </p>

            <h2 className={styles.sectionTitle}>11. Contact</h2>
            <p className={styles.copy}>
              Nier Transportation · 10105 E Via Linda, Ste A-105, Scottsdale, AZ
              85258 · (480) 300-6003 · reservations@niertransportation.com
            </p>
          </div>
        </LayoutWrapper>
      </section>
    </main>
  );
}
