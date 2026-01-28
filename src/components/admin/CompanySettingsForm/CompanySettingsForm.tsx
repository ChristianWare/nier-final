"use client";

import { useTransition } from "react";
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
    officeHoursMon: string;
    officeHoursSat: string;
    officeHoursSun: string;
  };
};

export default function CompanySettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        startTransition(() => {
          saveCompanySettings(fd).then((res) => {
            if (res?.error) return toast.error(res.error);
            toast.success("Company settings saved.");
          });
        });
      }}
    >
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
            <label className='emptyTitleSmall'>Dispatch Phone (Display)</label>
            <input
              name='dispatchPhone'
              className='input'
              placeholder='(480) 555-0123'
              defaultValue={initial.dispatchPhone}
            />
            <div className='miniNote'>Formatted for display</div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Dispatch Phone (Raw)</label>
            <input
              name='dispatchPhoneRaw'
              className='input'
              placeholder='4805550123'
              defaultValue={initial.dispatchPhoneRaw}
            />
            <div className='miniNote'>Numbers only, used for tel: links</div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Emergency Phone (Display)</label>
            <input
              name='emergencyPhone'
              className='input'
              placeholder='(480) 555-0911'
              defaultValue={initial.emergencyPhone}
            />
            <div className='miniNote'>For accidents & emergencies</div>
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Emergency Phone (Raw)</label>
            <input
              name='emergencyPhoneRaw'
              className='input'
              placeholder='4805550911'
              defaultValue={initial.emergencyPhoneRaw}
            />
            <div className='miniNote'>Numbers only, used for tel: links</div>
          </div>

          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Support Email</label>
            <input
              name='supportEmail'
              type='email'
              className='input'
              placeholder='drivers@yourcompany.com'
              defaultValue={initial.supportEmail}
            />
          </div>
        </div>
      </div>

      {/* Office Information */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Office Information</h2>
          <p className='miniNote'>Physical office location details</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className='emptyTitleSmall'>Office Name</label>
            <input
              name='officeName'
              className='input'
              placeholder='Main Office'
              defaultValue={initial.officeName}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Street Address</label>
            <input
              name='officeAddress'
              className='input'
              placeholder='123 Main Street'
              defaultValue={initial.officeAddress}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>City, State ZIP</label>
            <input
              name='officeCity'
              className='input'
              placeholder='Phoenix, AZ 85001'
              defaultValue={initial.officeCity}
            />
          </div>
        </div>
      </div>

      {/* Office Hours */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h4'>Office Hours</h2>
          <p className='miniNote'>When the office is open for walk-ins</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className='emptyTitleSmall'>Monday - Friday</label>
            <input
              name='officeHoursMon'
              className='input'
              placeholder='8:00 AM - 6:00 PM'
              defaultValue={initial.officeHoursMon}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Saturday</label>
            <input
              name='officeHoursSat'
              className='input'
              placeholder='9:00 AM - 2:00 PM'
              defaultValue={initial.officeHoursSat}
            />
          </div>

          <div className={styles.field}>
            <label className='emptyTitleSmall'>Sunday</label>
            <input
              name='officeHoursSun'
              className='input'
              placeholder='Closed'
              defaultValue={initial.officeHoursSun}
            />
          </div>
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
              <div className={styles.previewValue}>{initial.dispatchPhone}</div>
            </div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewIcon}>🆘</div>
            <div>
              <div className={styles.previewTitle}>Emergency Line</div>
              <div className={styles.previewValue}>
                {initial.emergencyPhone}
              </div>
            </div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewIcon}>✉️</div>
            <div>
              <div className={styles.previewTitle}>Email Support</div>
              <div className={styles.previewValue}>{initial.supportEmail}</div>
            </div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewIcon}>📍</div>
            <div>
              <div className={styles.previewTitle}>{initial.officeName}</div>
              <div className={styles.previewValue}>{initial.officeAddress}</div>
              <div className={styles.previewValue}>{initial.officeCity}</div>
            </div>
          </div>
        </div>
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
