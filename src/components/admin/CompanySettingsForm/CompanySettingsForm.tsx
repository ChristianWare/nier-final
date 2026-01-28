"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import styles from "./CompanySettingsForm.module.css";
import { saveCompanySettings } from "../../../../actions/admin/companySettings";
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
    officeHours: string; // JSON string of hours data
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

// Generate time options in 30-minute increments
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

// Format time from 24h to 12h display
function formatTime(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${mStr} ${ampm}`;
}

// Format phone number as (123) 456-7890
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 10);
  if (limited.length === 0) return "";
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6)
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

// Extract raw digits from formatted phone
function getRawPhone(value: string): string {
  return value.replace(/\D/g, "");
}

// Parse initial hours from JSON string
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

  // State for phone fields with formatting
  const [dispatchPhone, setDispatchPhone] = useState(initial.dispatchPhone);
  const [emergencyPhone, setEmergencyPhone] = useState(initial.emergencyPhone);

  // State for preview (updates on change)
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail);
  const [officeName, setOfficeName] = useState(initial.officeName);
  const [officeAddress, setOfficeAddress] = useState(initial.officeAddress);
  const [officeCity, setOfficeCity] = useState(initial.officeCity);

  // State for office hours
  const [officeHours, setOfficeHours] = useState<WeekHours>(
    parseInitialHours(initial.officeHours),
  );

  const handleDispatchPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const formatted = formatPhoneNumber(e.target.value);
    setDispatchPhone(formatted);
  };

  const handleEmergencyPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const formatted = formatPhoneNumber(e.target.value);
    setEmergencyPhone(formatted);
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

    // Add raw phone numbers to form data
    fd.set("dispatchPhoneRaw", getRawPhone(dispatchPhone));
    fd.set("emergencyPhoneRaw", getRawPhone(emergencyPhone));

    // Add office hours as JSON
    fd.set("officeHours", JSON.stringify(officeHours));

    startTransition(() => {
      saveCompanySettings(fd).then((res) => {
        if (res?.error) return toast.error(res.error);
        toast.success("Company settings saved.");
      });
    });
  };

  // Get enabled days for preview
  const enabledDays = DAYS.filter((d) => officeHours[d.key].enabled);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Contact Information */}
      <div className={styles.section}>
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
            <div className='miniNote'>For accidents & emergencies</div>
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

      {/* Office Information */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Office Information</h2>
          <p className='miniNote'>
            Physical office location details (optional - leave blank to hide
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

      {/* Office Hours */}
      <div className={styles.section}>
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
                    className={` ${styles.hoursSelect}`}
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
                    className={` ${styles.hoursSelect}`}
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

      {/* Preview */}
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

          {/* Only show address preview if filled out */}
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

        {/* Hours Preview */}
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
