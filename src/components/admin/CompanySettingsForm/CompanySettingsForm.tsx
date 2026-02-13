"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import styles from "./CompanySettingsForm.module.css";
import { saveCompanySettings } from "../../../../actions/admin/companySettings";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Button from "@/components/shared/Button/Button";

type Props = {
  initial: {
    dispatchPhone: string;
    dispatchPhoneRaw: string;
    emergencyPhone: string;
    emergencyPhoneRaw: string;
    supportEmail: string;
    officeName: string;
    officeAddress: string;
    officeCity: string;
    officeHours: string;
    smsFromNumber: string;
    // Branding
    companyName: string;
    companyTagline: string;
    logoUrl: string;
    // Email
    emailSenderName: string;
    emailReplyTo: string;
    emailFooterText: string;
    // Timezone
    timezone: string;
    // Social
    websiteUrl: string;
    googleBusinessUrl: string;
    yelpUrl: string;
    instagramUrl: string;
    facebookUrl: string;
    twitterUrl: string;
    linkedinUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
    // Legal
    taxId: string;
    businessLicense: string;
  };
};

type DayHours = {
  enabled: boolean;
  open: string;
  close: string;
};

type WeekHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

const DEFAULT_HOURS: WeekHours = {
  monday: { enabled: true, open: "08:00", close: "18:00" },
  tuesday: { enabled: true, open: "08:00", close: "18:00" },
  wednesday: { enabled: true, open: "08:00", close: "18:00" },
  thursday: { enabled: true, open: "08:00", close: "18:00" },
  friday: { enabled: true, open: "08:00", close: "18:00" },
  saturday: { enabled: true, open: "09:00", close: "14:00" },
  sunday: { enabled: false, open: "09:00", close: "17:00" },
};

const DAYS: { key: keyof WeekHours; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const TIMEZONE_OPTIONS = [
  { value: "America/Phoenix", label: "Phoenix (MST, no DST)" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
];

const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
    TIME_OPTIONS.push({ value, label });
  }
}

function formatTime(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${mStr} ${ampm}`;
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 10);
  if (limited.length === 0) return "";
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6)
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

function getRawPhone(value: string): string {
  return value.replace(/\D/g, "");
}

function parseInitialHours(hoursJson: string): WeekHours {
  try {
    const parsed = JSON.parse(hoursJson);
    return { ...DEFAULT_HOURS, ...parsed };
  } catch {
    return DEFAULT_HOURS;
  }
}

export default function CompanySettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();

  /* ── Existing state ── */
  const [dispatchPhone, setDispatchPhone] = useState(initial.dispatchPhone);
  const [emergencyPhone, setEmergencyPhone] = useState(initial.emergencyPhone);
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail);
  const [officeName, setOfficeName] = useState(initial.officeName);
  const [officeAddress, setOfficeAddress] = useState(initial.officeAddress);
  const [officeCity, setOfficeCity] = useState(initial.officeCity);
  const [officeHours, setOfficeHours] = useState<WeekHours>(
    parseInitialHours(initial.officeHours),
  );
  const [smsFromNumber, setSmsFromNumber] = useState(initial.smsFromNumber);

  /* ── Branding ── */
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companyTagline, setCompanyTagline] = useState(initial.companyTagline);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);

  /* ── Email ── */
  const [emailSenderName, setEmailSenderName] = useState(
    initial.emailSenderName,
  );
  const [emailReplyTo, setEmailReplyTo] = useState(initial.emailReplyTo);
  const [emailFooterText, setEmailFooterText] = useState(
    initial.emailFooterText,
  );

  /* ── Timezone ── */
  const [timezone, setTimezone] = useState(initial.timezone);

  /* ── Social ── */
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl);
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState(
    initial.googleBusinessUrl,
  );
  const [yelpUrl, setYelpUrl] = useState(initial.yelpUrl);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [twitterUrl, setTwitterUrl] = useState(initial.twitterUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);
  const [tiktokUrl, setTiktokUrl] = useState(initial.tiktokUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl);

  /* ── Legal ── */
  const [taxId, setTaxId] = useState(initial.taxId);
  const [businessLicense, setBusinessLicense] = useState(
    initial.businessLicense,
  );

  /* ── Dirty form tracking ── */
  const changedFields = useMemo(() => {
    const fields: string[] = [];
    if (dispatchPhone !== initial.dispatchPhone) fields.push("Dispatch Phone");
    if (emergencyPhone !== initial.emergencyPhone)
      fields.push("Emergency Phone");
    if (supportEmail !== initial.supportEmail) fields.push("Support Email");
    if (officeName !== initial.officeName) fields.push("Office Name");
    if (officeAddress !== initial.officeAddress) fields.push("Street Address");
    if (officeCity !== initial.officeCity) fields.push("City/State/ZIP");
    if (smsFromNumber !== initial.smsFromNumber) fields.push("SMS From Number");
    if (JSON.stringify(officeHours) !== initial.officeHours)
      fields.push("Office Hours");
    // Branding
    if (companyName !== initial.companyName) fields.push("Company Name");
    if (companyTagline !== initial.companyTagline)
      fields.push("Company Tagline");
    if (logoUrl !== initial.logoUrl) fields.push("Logo URL");
    // Email
    if (emailSenderName !== initial.emailSenderName)
      fields.push("Email Sender Name");
    if (emailReplyTo !== initial.emailReplyTo) fields.push("Reply-To Email");
    if (emailFooterText !== initial.emailFooterText)
      fields.push("Email Footer");
    // Timezone
    if (timezone !== initial.timezone) fields.push("Timezone");
    // Social
    if (websiteUrl !== initial.websiteUrl) fields.push("Website URL");
    if (googleBusinessUrl !== initial.googleBusinessUrl)
      fields.push("Google Business URL");
    if (yelpUrl !== initial.yelpUrl) fields.push("Yelp URL");
    if (instagramUrl !== initial.instagramUrl) fields.push("Instagram URL");
    if (facebookUrl !== initial.facebookUrl) fields.push("Facebook URL");
    if (twitterUrl !== initial.twitterUrl) fields.push("X / Twitter URL");
    if (linkedinUrl !== initial.linkedinUrl) fields.push("LinkedIn URL");
    if (tiktokUrl !== initial.tiktokUrl) fields.push("TikTok URL");
    if (youtubeUrl !== initial.youtubeUrl) fields.push("YouTube URL");
    // Legal
    if (taxId !== initial.taxId) fields.push("Tax ID");
    if (businessLicense !== initial.businessLicense)
      fields.push("Business License");
    return fields;
  }, [
    dispatchPhone,
    emergencyPhone,
    supportEmail,
    officeName,
    officeAddress,
    officeCity,
    smsFromNumber,
    officeHours,
    companyName,
    companyTagline,
    logoUrl,
    emailSenderName,
    emailReplyTo,
    emailFooterText,
    timezone,
    websiteUrl,
    googleBusinessUrl,
    yelpUrl,
    instagramUrl,
    facebookUrl,
    twitterUrl,
    linkedinUrl,
    tiktokUrl,
    youtubeUrl,
    taxId,
    businessLicense,
    initial,
  ]);

  useDirtyForm(
    "company-settings",
    changedFields.length > 0,
    "company-settings-form",
    changedFields,
  );

  /* ── Handlers ── */
  const handleDispatchPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDispatchPhone(formatPhoneNumber(e.target.value));
  };

  const handleEmergencyPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setEmergencyPhone(formatPhoneNumber(e.target.value));
  };

  const handleDayToggle = (day: keyof WeekHours) => {
    setOfficeHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleTimeChange = (
    day: keyof WeekHours,
    field: "open" | "close",
    value: string,
  ) => {
    setOfficeHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    fd.set("dispatchPhoneRaw", getRawPhone(dispatchPhone));
    fd.set("emergencyPhoneRaw", getRawPhone(emergencyPhone));
    fd.set("officeHours", JSON.stringify(officeHours));

    startTransition(() => {
      saveCompanySettings(fd).then((res) => {
        if (res?.error) return toast.error(res.error);
        toast.success("Company settings saved.");
      });
    });
  };

  const enabledDays = DAYS.filter((d) => officeHours[d.key].enabled);

  return (
    <form
      id='company-settings-form'
      className={styles.form}
      onSubmit={handleSubmit}
    >
      {/* ═══════════════════════════════════════════
          BRANDING
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='branding-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Company Branding</h2>
          <p className='miniNote'>
            Your company name and branding used across invoices, emails, and the
            booking experience
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className='emptyTitleSmall'>Company Name</label>
            <input
              name='companyName'
              className='input subheading'
              placeholder='Your company name'
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <div className='miniNote'>
              Appears on invoices, emails, and booking confirmations
            </div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Tagline</label>
            <input
              name='companyTagline'
              className='input subheading'
              placeholder='Premium Black Car Service'
              value={companyTagline}
              onChange={(e) => setCompanyTagline(e.target.value)}
            />
            <div className='miniNote'>Short description shown in emails</div>
          </div>

          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Logo URL</label>
            <input
              name='logoUrl'
              className='input subheading'
              placeholder='https://yourdomain.com/logo.png'
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <div className='miniNote'>
              Direct link to your logo image (PNG or SVG recommended, at least
              400px wide)
            </div>
          </div>

          {logoUrl && (
            <div className={styles.fieldFull}>
              <div className={styles.logoPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt='Logo preview'
                  className={styles.logoImg}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CONTACT INFORMATION
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='contact-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Contact Information</h2>
          <p className='miniNote'>
            This information is displayed on the driver support page
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className='emptyTitleSmall'>Dispatch Phone</label>
            <input
              name='dispatchPhone'
              className='input subheading'
              placeholder='(480) 555-0123'
              value={dispatchPhone}
              onChange={handleDispatchPhoneChange}
              inputMode='tel'
            />
            <div className='miniNote'>Main dispatch line for drivers</div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Emergency Phone</label>
            <input
              name='emergencyPhone'
              className='input subheading'
              placeholder='(480) 555-0911'
              value={emergencyPhone}
              onChange={handleEmergencyPhoneChange}
              inputMode='tel'
            />
            <div className='miniNote'>For accidents &amp; emergencies</div>
          </div>

          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Support Email</label>
            <input
              name='supportEmail'
              type='email'
              className='input subheading'
              placeholder='drivers@yourcompany.com'
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          EMAIL SETTINGS
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='email-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Email Settings</h2>
          <p className='miniNote'>
            Configure how outgoing emails appear to customers and drivers
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className='emptyTitleSmall'>Sender Name</label>
            <input
              name='emailSenderName'
              className='input subheading'
              placeholder='Your company name'
              value={emailSenderName}
              onChange={(e) => setEmailSenderName(e.target.value)}
            />
            <div className='miniNote'>
              The &quot;From&quot; name in booking confirmations and
              notifications
            </div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Reply-To Email</label>
            <input
              name='emailReplyTo'
              type='email'
              className='input subheading'
              placeholder='bookings@yourcompany.com'
              value={emailReplyTo}
              onChange={(e) => setEmailReplyTo(e.target.value)}
            />
            <div className='miniNote'>
              Where replies go when customers respond to automated emails
            </div>
          </div>

          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Email Footer Text</label>
            <textarea
              name='emailFooterText'
              className={`input subheading ${styles.textarea}`}
              placeholder='© 2026 Nier Transportation LLC. Premium black car service in Phoenix, AZ.'
              value={emailFooterText}
              onChange={(e) => setEmailFooterText(e.target.value)}
              rows={3}
            />
            <div className='miniNote'>
              Shown at the bottom of all outgoing emails
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SMS SETTINGS
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='sms-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>SMS Notifications</h2>
          <p className='miniNote'>
            Configure the phone number used to send SMS notifications
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>SMS From Number</label>
            <input
              name='smsFromNumber'
              className='input subheading'
              placeholder='+15209992737'
              value={smsFromNumber}
              onChange={(e) => setSmsFromNumber(e.target.value)}
              inputMode='tel'
            />
            <div className='miniNote'>
              Twilio phone number in E.164 format (e.g., +15209992737). Leave
              blank to use system default.
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          OFFICE INFORMATION
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='office-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Office Information</h2>
          <p className='miniNote'>
            Physical office location details (optional — leave blank to hide
            from drivers)
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Office Name</label>
            <input
              name='officeName'
              className='input subheading'
              placeholder='Main Office'
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Street Address</label>
            <input
              name='officeAddress'
              className='input subheading'
              placeholder='123 Main Street'
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>City, State ZIP</label>
            <input
              name='officeCity'
              className='input subheading'
              placeholder='Phoenix, AZ 85001'
              value={officeCity}
              onChange={(e) => setOfficeCity(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TIMEZONE
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='timezone-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Default Timezone</h2>
          <p className='miniNote'>
            Used for business reporting, booking displays, and all date/time
            calculations
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className='emptyTitleSmall'>Timezone</label>
            <select
              name='timezone'
              className='input subheading'
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          HOURS OF OPERATION
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='hours-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Hours of Operation</h2>
          <p className='miniNote'>
            Select which days the office is open and set hours
          </p>
        </div>

        <div className={styles.hoursTable}>
          <div className={styles.hoursHeader}>
            <div className={styles.hoursHeaderDay}>Day</div>
            <div className={styles.hoursHeaderTime}>Open</div>
            <div className={styles.hoursHeaderTime}>Close</div>
          </div>

          {DAYS.map(({ key, label }) => {
            const day = officeHours[key];
            return (
              <div
                key={key}
                className={`${styles.hoursRow} ${!day.enabled ? styles.hoursRowDisabled : ""}`}
              >
                <div className={styles.hoursDayCell}>
                  <label className={styles.hoursCheckLabel}>
                    <input
                      type='checkbox'
                      checked={day.enabled}
                      onChange={() => handleDayToggle(key)}
                      className={styles.hoursCheckbox}
                    />
                    <span className={styles.hoursDayName}>{label}</span>
                  </label>
                </div>

                <div className={styles.hoursTimeCell}>
                  <select
                    className={`input ${styles.hoursSelect}`}
                    value={day.open}
                    onChange={(e) =>
                      handleTimeChange(key, "open", e.target.value)
                    }
                    disabled={!day.enabled}
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.hoursTimeCell}>
                  <select
                    className={`input ${styles.hoursSelect}`}
                    value={day.close}
                    onChange={(e) =>
                      handleTimeChange(key, "close", e.target.value)
                    }
                    disabled={!day.enabled}
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!day.enabled && (
                  <div className={styles.hoursClosedBadge}>Closed</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SOCIAL LINKS
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='social-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Social &amp; Web Presence</h2>
          <p className='miniNote'>
            Links shown in the website footer, email footers, and the
            customer-facing booking site. Only platforms with a URL will display
            an icon.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Website URL</label>
            <input
              name='websiteUrl'
              className='input subheading'
              placeholder='https://yourcompany.com'
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Google Business Profile</label>
            <input
              name='googleBusinessUrl'
              className='input subheading'
              placeholder='https://g.page/your-business'
              value={googleBusinessUrl}
              onChange={(e) => setGoogleBusinessUrl(e.target.value)}
            />
            <div className='miniNote'>
              Your Google Business listing URL for reviews
            </div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Yelp Page</label>
            <input
              name='yelpUrl'
              className='input subheading'
              placeholder='https://yelp.com/biz/your-business'
              value={yelpUrl}
              onChange={(e) => setYelpUrl(e.target.value)}
            />
            <div className='miniNote'>Your Yelp business listing URL</div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Instagram</label>
            <input
              name='instagramUrl'
              className='input subheading'
              placeholder='https://instagram.com/yourbusiness'
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Facebook</label>
            <input
              name='facebookUrl'
              className='input subheading'
              placeholder='https://facebook.com/yourbusiness'
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>X / Twitter</label>
            <input
              name='twitterUrl'
              className='input subheading'
              placeholder='https://x.com/yourbusiness'
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>LinkedIn</label>
            <input
              name='linkedinUrl'
              className='input subheading'
              placeholder='https://linkedin.com/company/yourbusiness'
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>TikTok</label>
            <input
              name='tiktokUrl'
              className='input subheading'
              placeholder='https://tiktok.com/@yourbusiness'
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>YouTube</label>
            <input
              name='youtubeUrl'
              className='input subheading'
              placeholder='https://youtube.com/@yourbusiness'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          LEGAL / TAX INFO
      ═══════════════════════════════════════════ */}
      <div className={styles.section} id='legal-section'>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Legal &amp; Tax Information</h2>
          <p className='miniNote'>
            Shown on invoices and corporate account documentation
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className='emptyTitleSmall'>Tax ID / EIN</label>
            <input
              name='taxId'
              className='input subheading'
              placeholder='XX-XXXXXXX'
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
            <div className='miniNote'>
              Federal Employer Identification Number for invoices
            </div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Business License #</label>
            <input
              name='businessLicense'
              className='input subheading'
              placeholder='License number'
              value={businessLicense}
              onChange={(e) => setBusinessLicense(e.target.value)}
            />
            <div className='miniNote'>
              State or local business license number
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          PREVIEW
      ═══════════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Preview</h2>
          <p className='miniNote'>
            How this will appear on the driver support page
          </p>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewCard}>
            <div className={styles.previewIcon}>📞</div>
            <div>
              <div className={styles.previewTitle}>Call Dispatch</div>
              <div className={styles.previewValue}>
                {dispatchPhone || "(480) 555-0123"}
              </div>
            </div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewIcon}>🆘</div>
            <div>
              <div className={styles.previewTitle}>Emergency Line</div>
              <div className={styles.previewValue}>
                {emergencyPhone || "(480) 555-0911"}
              </div>
            </div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewIcon}>✉️</div>
            <div>
              <div className={styles.previewTitle}>Email Support</div>
              <div className={styles.previewValue}>
                {supportEmail || "drivers@yourcompany.com"}
              </div>
            </div>
          </div>

          {(officeName || officeAddress || officeCity) && (
            <div className={styles.previewCard}>
              <div className={styles.previewIcon}>📍</div>
              <div>
                <div className={styles.previewTitle}>
                  {officeName || "Main Office"}
                </div>
                {officeAddress && (
                  <div className={styles.previewValue}>{officeAddress}</div>
                )}
                {officeCity && (
                  <div className={styles.previewValue}>{officeCity}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {enabledDays.length > 0 && (
          <div className={styles.previewHours}>
            <div className={styles.previewHoursTitle}>
              <span className={styles.previewIcon}>🕐</span>
              <span>Office Hours</span>
            </div>
            <div className={styles.previewHoursList}>
              {DAYS.map(({ key, label }) => {
                const day = officeHours[key];
                return (
                  <div key={key} className={styles.previewHoursRow}>
                    <span className={styles.previewHoursDay}>{label}</span>
                    <span className={styles.previewHoursTime}>
                      {day.enabled
                        ? `${formatTime(day.open)} - ${formatTime(day.close)}`
                        : "Closed"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          SUBMIT
      ═══════════════════════════════════════════ */}
      <div className={styles.actions}>
        <Button
          text={isPending ? "Saving..." : "Save Settings"}
          btnType='blackReg'
          disabled={isPending}
          type='submit'
        />
      </div>
    </form>
  );
}
