/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./DriverSupportPage.module.css";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import DriverSupportFAQ from "./Driversupportfaq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

export default async function DriverSupportPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/support");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverIdOrNull = await resolveSessionUserId(session);
  if (!driverIdOrNull) redirect("/");

  // Fetch company settings from database
  const settings = await getCompanySettings();

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href='/driver-dashboard' className={`${styles.backBtn} backBtn`}>
          <Arrow className='backArrow' /> Back to Dashboard
        </Link>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className='h2'>Support</h1>
            <p className='subheading'>
              Get help, find answers, or contact dispatch
            </p>
          </div>
        </div>
      </header>

      {/* Emergency Contact - Prominent */}
      <div className={styles.emergencyCard}>
        <div className={styles.emergencyIcon}>🚨</div>
        <div className={styles.emergencyContent}>
          <h2 className={styles.emergencyTitle}>Need Immediate Help?</h2>
          <p className={styles.emergencyText}>
            If you're on a trip and need urgent assistance, call dispatch
            immediately.
          </p>
        </div>
        <a
          href={`tel:${settings.dispatchPhoneRaw}`}
          className={styles.emergencyButton}
        >
          📞 Call Dispatch Now
        </a>
      </div>

      {/* Contact Options Grid */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Contact Us</h2>
          <p className='miniNote'>Choose the best way to reach us</p>
        </div>

        <div className={styles.contactGrid}>
          <a
            href={`tel:${settings.dispatchPhoneRaw}`}
            className={styles.contactCard}
          >
            <div className={styles.contactIcon}>📞</div>
            <div className={styles.contactInfo}>
              <div className={styles.contactTitle}>Call Dispatch</div>
              <div className={styles.contactDetail}>
                {settings.dispatchPhone}
              </div>
              <div className={styles.contactHours}>Available 24/7</div>
            </div>
          </a>

          <a
            href={`sms:${settings.dispatchPhoneRaw}`}
            className={styles.contactCard}
          >
            <div className={styles.contactIcon}>💬</div>
            <div className={styles.contactInfo}>
              <div className={styles.contactTitle}>Text Dispatch</div>
              <div className={styles.contactDetail}>
                {settings.dispatchPhone}
              </div>
              <div className={styles.contactHours}>Response within 15 min</div>
            </div>
          </a>

          <a
            href={`mailto:${settings.supportEmail}`}
            className={styles.contactCard}
          >
            <div className={styles.contactIcon}>✉️</div>
            <div className={styles.contactInfo}>
              <div className={styles.contactTitle}>Email Support</div>
              <div className={styles.contactDetail}>
                {settings.supportEmail}
              </div>
              <div className={styles.contactHours}>
                Response within 24 hours
              </div>
            </div>
          </a>

          <a
            href={`tel:${settings.emergencyPhoneRaw}`}
            className={`${styles.contactCard} ${styles.contactCardEmergency}`}
          >
            <div className={styles.contactIcon}>🆘</div>
            <div className={styles.contactInfo}>
              <div className={styles.contactTitle}>Emergency Line</div>
              <div className={styles.contactDetail}>
                {settings.emergencyPhone}
              </div>
              <div className={styles.contactHours}>
                Accidents & emergencies only
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Frequently Asked Questions</h2>
          <p className='miniNote'>Quick answers to common questions</p>
        </div>

        <DriverSupportFAQ />
      </div>

      {/* Quick Links */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Resources</h2>
          <p className='miniNote'>Helpful documents and guides</p>
        </div>

        <div className={styles.resourcesGrid}>
          <div className={styles.resourceCard}>
            <div className={styles.resourceIcon}>📖</div>
            <div className={styles.resourceContent}>
              <div className={styles.resourceTitle}>Driver Handbook</div>
              <div className={styles.resourceDesc}>
                Complete guide to policies, procedures, and best practices
              </div>
            </div>
            <span className={styles.resourceBadge}>PDF</span>
          </div>

          <div className={styles.resourceCard}>
            <div className={styles.resourceIcon}>✅</div>
            <div className={styles.resourceContent}>
              <div className={styles.resourceTitle}>
                Vehicle Inspection Checklist
              </div>
              <div className={styles.resourceDesc}>
                Daily pre-trip inspection requirements
              </div>
            </div>
            <span className={styles.resourceBadge}>PDF</span>
          </div>

          <div className={styles.resourceCard}>
            <div className={styles.resourceIcon}>🛡️</div>
            <div className={styles.resourceContent}>
              <div className={styles.resourceTitle}>Safety Guidelines</div>
              <div className={styles.resourceDesc}>
                Passenger safety and emergency procedures
              </div>
            </div>
            <span className={styles.resourceBadge}>PDF</span>
          </div>

          <div className={styles.resourceCard}>
            <div className={styles.resourceIcon}>💳</div>
            <div className={styles.resourceContent}>
              <div className={styles.resourceTitle}>Payment & Earnings FAQ</div>
              <div className={styles.resourceDesc}>
                How and when you get paid
              </div>
            </div>
            <span className={styles.resourceBadge}>PDF</span>
          </div>
        </div>
      </div>

      {/* Office Hours Card */}
      <div className={styles.section}>
        <div className={styles.officeCard}>
          <div className={styles.officeContent}>
            <h2 className='cardTitle h4'>Office Hours</h2>
            <div className={styles.officeHours}>
              <div className={styles.officeRow}>
                <span className={styles.officeDay}>Monday - Friday</span>
                <span className={styles.officeTime}>
                  {settings.officeHoursMon}
                </span>
              </div>
              <div className={styles.officeRow}>
                <span className={styles.officeDay}>Saturday</span>
                <span className={styles.officeTime}>
                  {settings.officeHoursSat}
                </span>
              </div>
              <div className={styles.officeRow}>
                <span className={styles.officeDay}>Sunday</span>
                <span className={styles.officeTime}>
                  {settings.officeHoursSun}
                </span>
              </div>
            </div>
            <p className='miniNote' style={{ marginTop: "1rem" }}>
              Dispatch is available 24/7 for active trip support
            </p>
          </div>
          <div className={styles.officeMap}>
            <div className={styles.officeAddress}>
              <div className={styles.officeIcon}>📍</div>
              <div>
                <div className={styles.officeName}>{settings.officeName}</div>
                <div className={styles.officeStreet}>
                  {settings.officeAddress}
                </div>
                <div className={styles.officeCity}>{settings.officeCity}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
