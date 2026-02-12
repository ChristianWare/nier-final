import { getCompanySettings } from "../../../../actions/admin/companySettings";
import CompanySettingsForm from "@/components/admin/CompanySettingsForm/CompanySettingsForm";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import styles from "./AdminCompanyPage.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEZONE_LABELS: Record<string, string> = {
  "America/Phoenix": "Phoenix (MST)",
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
};

type DayHours = { enabled: boolean; open: string; close: string };
type WeekHours = Record<string, DayHours>;

function summarizeHours(hoursJson: string): string {
  try {
    const hours: WeekHours = JSON.parse(hoursJson);
    const dayOrder = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const dayAbbr: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };
    const enabledKeys = dayOrder.filter((k) => (hours[k] as DayHours)?.enabled);

    if (enabledKeys.length === 0) return "Closed";
    if (enabledKeys.length === 7) return "Open 7 days";

    const firstIdx = dayOrder.indexOf(enabledKeys[0]);
    const lastIdx = dayOrder.indexOf(enabledKeys[enabledKeys.length - 1]);
    const isContiguous =
      enabledKeys.length === lastIdx - firstIdx + 1 &&
      enabledKeys.every((k, i) => dayOrder.indexOf(k) === firstIdx + i);

    if (isContiguous && enabledKeys.length > 2) {
      return `${dayAbbr[enabledKeys[0]]}–${dayAbbr[enabledKeys[enabledKeys.length - 1]]}`;
    }

    return enabledKeys.map((k) => dayAbbr[k]).join(", ");
  } catch {
    return "Not configured";
  }
}

function countConfigured(initial: Record<string, string>): {
  configured: number;
  total: number;
} {
  const sections = [
    [initial.companyName, initial.logoUrl],
    [initial.dispatchPhone, initial.emergencyPhone, initial.supportEmail],
    [initial.emailSenderName, initial.emailReplyTo],
    [initial.officeName, initial.officeAddress],
    [initial.websiteUrl],
    [initial.taxId, initial.businessLicense],
  ];

  let configured = 0;
  for (const fields of sections) {
    const hasValue = fields.some(
      (f) =>
        f &&
        f.trim() !== "" &&
        !f.includes("555-") &&
        f !== "support@yourcompany.com",
    );
    if (hasValue) configured++;
  }
  return { configured, total: sections.length };
}

export default async function AdminCompanyPage() {
  const initial = await getCompanySettings();

  const tzLabel =
    TIMEZONE_LABELS[initial.timezone] || initial.timezone || "Not set";
  const hoursSummary = summarizeHours(initial.officeHours);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { configured, total } = countConfigured(initial as any);

  const hasLogo = !!initial.logoUrl?.trim();

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.top}>
            <div className={styles.profileInfo}>
              <h1 className={`${styles.heading} h2`}>
                {initial.companyName?.trim() || "Company Settings"}
              </h1>
              {initial.companyTagline?.trim() && (
                <p className={styles.tagline}>{initial.companyTagline}</p>
              )}
              <div className={styles.badgesRow}>
                <span className='badge badge_accent'>{tzLabel}</span>
                <span
                  className={`badge ${configured >= 4 ? "badge_good" : "badge_warn"}`}
                >
                  {configured}/{total} sections configured
                </span>
                {hasLogo && (
                  <span className='badge badge_good'>Logo uploaded</span>
                )}
              </div>
            </div>
            {hasLogo && (
              <div className={styles.headerLogo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={initial.logoUrl}
                  alt='Company logo'
                  className={styles.headerLogoImg}
                />
              </div>
            )}
          </div>
        </header>

        {/* ── Summary Cards Grid ── */}
        <div className={styles.grid}>
          {/* Company Profile */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Company Profile</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>
                  {initial.companyName?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tagline</span>
                <span className={styles.infoValue}>
                  {initial.companyTagline?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Timezone</span>
                <span className={styles.infoValue}>{tzLabel}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Logo</span>
                <span className={styles.infoValue}>
                  {hasLogo ? (
                    <span className='badge badge_good'>Uploaded</span>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Contact & Support */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Contact &amp; Support</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dispatch</span>
                <span className={styles.infoValue}>
                  {initial.dispatchPhone || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Emergency</span>
                <span className={styles.infoValue}>
                  {initial.emergencyPhone || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>
                  {initial.supportEmail || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>SMS #</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {initial.smsFromNumber?.trim() || "System default"}
                </span>
              </div>
            </div>
          </div>

          {/* Email Configuration */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Email Configuration</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sender</span>
                <span className={styles.infoValue}>
                  {initial.emailSenderName?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Reply-To</span>
                <span className={styles.infoValue}>
                  {initial.emailReplyTo?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Footer</span>
                <span className={styles.infoValue}>
                  {initial.emailFooterText?.trim()
                    ? initial.emailFooterText.length > 60
                      ? `${initial.emailFooterText.slice(0, 60)}…`
                      : initial.emailFooterText
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Office & Hours */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Office &amp; Hours</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Office</span>
                <span className={styles.infoValue}>
                  {initial.officeName?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}>
                  {initial.officeAddress?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>City</span>
                <span className={styles.infoValue}>
                  {initial.officeCity?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Hours</span>
                <span className={styles.infoValue}>{hoursSummary}</span>
              </div>
            </div>
          </div>

          {/* Web Presence */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Web Presence</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Website</span>
                <span className={styles.infoValue}>
                  {initial.websiteUrl?.trim() ? (
                    <a
                      href={initial.websiteUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={styles.link}
                    >
                      {initial.websiteUrl.replace(/^https?:\/\//, "")} ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Google</span>
                <span className={styles.infoValue}>
                  {initial.googleBusinessUrl?.trim() ? (
                    <a
                      href={initial.googleBusinessUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={styles.link}
                    >
                      View listing ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Yelp</span>
                <span className={styles.infoValue}>
                  {initial.yelpUrl?.trim() ? (
                    <a
                      href={initial.yelpUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={styles.link}
                    >
                      View listing ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Legal */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Legal &amp; Tax</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tax ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {initial.taxId?.trim() || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>License #</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {initial.businessLicense?.trim() || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Edit Form ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Edit Settings</h2>
            <p className='miniNote'>
              Update your company branding, contact information, email
              configuration, and business details
            </p>
          </div>
          <CompanySettingsForm initial={initial} />
        </div>
      </section>
    </DirtyFormProvider>
  );
}
