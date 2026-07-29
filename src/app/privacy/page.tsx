import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { SITE_URL } from "@/lib/site";
import styles from "./LegalPage.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Nier Transportation",
  description:
    "How Nier Transportation collects, uses, and protects your information when you book chauffeured transportation or use our website.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <main>
      <Nav background='white' />
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={styles.content}>
            <h1 className={`${styles.heading} h1`}>Privacy Policy</h1>
            <p className={styles.updated}>Effective date: July 29, 2026</p>

            <p className={styles.copy}>
              Nier Transportation (&quot;we,&quot; &quot;us&quot;) respects your
              privacy. This policy explains what information we collect when you
              use niertransportation.com or book our services, how we use it,
              and the choices you have.
            </p>

            <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Booking details</strong> — name, phone number, email,
                pickup and drop-off locations, trip dates and times, flight
                numbers, passenger counts, and any special requests you provide.
              </li>
              <li className={styles.listItem}>
                <strong>Account information</strong> — login credentials and
                profile details if you create an account, plus saved preferences
                such as addresses and gate instructions you choose to store.
              </li>
              <li className={styles.listItem}>
                <strong>Payment information</strong> — payments are processed by
                our third-party payment processor. We receive confirmation of
                payment and limited card details (such as brand and last four
                digits); full card numbers are never stored on our servers.
              </li>
              <li className={styles.listItem}>
                <strong>Technical information</strong> — standard log and device
                data (such as IP address and browser type) collected when you
                use the site, and cookies required to keep you signed in and the
                site functioning.
              </li>
            </ul>

            <h2 className={styles.sectionTitle}>
              2. How We Use Your Information
            </h2>
            <p className={styles.copy}>
              We use your information to provide and dispatch your
              transportation, communicate about your reservations by email,
              phone, or text (confirmations, driver details, flight-delay
              adjustments), process payments, maintain your account, improve our
              services, and meet legal and safety obligations. If you opt in to
              notifications, we use your contact details to deliver them; you
              can opt out at any time.
            </p>

            <h2 className={styles.sectionTitle}>3. How We Share It</h2>
            <p className={styles.copy}>
              We do not sell your personal information. We share it only as
              needed to run the service: with your assigned chauffeur (trip
              details necessary to complete your ride), with service providers
              who process payments, deliver email and text messages, and host
              our systems, and where required by law or to protect safety and
              legal rights. Corporate account trip details are shared with the
              account administrator who arranges travel on your behalf.
            </p>

            <h2 className={styles.sectionTitle}>4. Data Retention</h2>
            <p className={styles.copy}>
              We keep booking and account records for as long as needed to
              provide service, meet bookkeeping and legal requirements, and
              resolve disputes. You may request deletion of your account and
              associated personal information, subject to records we are
              required to retain.
            </p>

            <h2 className={styles.sectionTitle}>5. Security</h2>
            <p className={styles.copy}>
              We use industry-standard safeguards — encrypted connections,
              access controls, and reputable infrastructure providers — to
              protect your information. No method of transmission or storage is
              completely secure, but we work to protect your data accordingly.
            </p>

            <h2 className={styles.sectionTitle}>6. Your Choices</h2>
            <p className={styles.copy}>
              You can access and update your information in your account
              dashboard, unsubscribe from non-essential messages using the link
              in any email, and request a copy or deletion of your personal
              information by contacting us. We will respond to verified requests
              as required by applicable law.
            </p>

            <h2 className={styles.sectionTitle}>7. Children</h2>
            <p className={styles.copy}>
              Our website and booking services are intended for adults. Children
              ride with us all the time — but accounts and bookings must be made
              by someone 18 or older, and we do not knowingly collect personal
              information from children online.
            </p>

            <h2 className={styles.sectionTitle}>8. Changes to This Policy</h2>
            <p className={styles.copy}>
              We may update this policy from time to time; the effective date
              above reflects the latest revision. Material changes will be
              posted on this page.
            </p>

            <h2 className={styles.sectionTitle}>9. Contact</h2>
            <p className={styles.copy}>
              Questions or requests about your data: Nier Transportation · 10105
              E Via Linda, Ste A-105, Scottsdale, AZ 85258 · (480) 300-6003 ·
              reservations@niertransportation.com
            </p>
          </div>
        </LayoutWrapper>
      </section>
    </main>
  );
}
