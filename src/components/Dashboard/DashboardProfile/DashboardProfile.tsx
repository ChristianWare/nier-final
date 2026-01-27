import styles from "./DashboardProfile.module.css";
import { updateName } from "../../../../actions/auth/updateName";
import { updatePhone } from "../../../../actions/auth/updatePhone";
import { changePassword } from "../../../../actions/auth/changePassword";
import SubmitButton from "./SubmitButton";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function DashboardProfile({
  user,
  flash,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null; // ✅ ADD THIS
    emailVerified: Date | null;
    hasPassword: boolean;
  };
  flash: { ok: string | null; err: string | null };
}) {
  const verifiedLabel = user.emailVerified
    ? `Verified • ${formatDate(user.emailVerified)}`
    : "Not verified";

  return (
    <section className='container' aria-label='Profile and security'>
      <header className='header'>
        <h1 className='heading h2'>Profile & security</h1>
        <p className='subheading'>
          Update your account details and manage security settings.
        </p>
      </header>

      {flash.err ? (
        <div className={`banner bannerError`}>{flash.err}</div>
      ) : null}

      {flash.ok ? <div className={`banner bannerOk`}>{flash.ok}</div> : null}

      <div className={styles.grid}>
        {/* Account */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Account</h2>
          </header>
          <div className={styles.rows}>
            <div className={styles.row}>
              <div className='emptyTitle'>Email</div>
              <div className='val'>{user.email}</div>
            </div>

            <div className={styles.row}>
              <div className='emptyTitle'>Status</div>
              <div className='val'>
                <span
                  className={`pill ${user.emailVerified ? "pillGood" : "pillWarn"}`}
                >
                  {verifiedLabel}
                </span>
              </div>
            </div>

            {!user.emailVerified ? (
              <p className={styles.helpText}>
                If you haven&#39;t verified your email yet, check your inbox for the
                verification link.
              </p>
            ) : null}
          </div>
        </section>

        {/* Update name */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Display name</h2>
          </header>

          <form action={updateName} className={styles.form}>
            <input type='hidden' name='userId' value={user.id} />

            <label className='label'>
              Name
              <input
                name='name'
                defaultValue={user.name ?? ""}
                className={styles.input}
                placeholder='Your name'
                maxLength={60}
              />
            </label>

            <div className={styles.formActions}>
              <SubmitButton className='primaryBtn' text='Save name' />
              <p className='miniNote'>
                This is what you&#39;ll see in your dashboard and receipts.
              </p>
            </div>
          </form>
        </section>

        {/* ✅ NEW: Phone number section */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Phone number</h2>
          </header>

          <form action={updatePhone} className={styles.form}>
            <input type='hidden' name='userId' value={user.id} />

            <label className='label'>
              Phone
              <input
                name='phone'
                type='tel'
                defaultValue={user.phone ?? ""}
                className={styles.input}
                placeholder='(602) 555-1234'
                maxLength={20}
              />
            </label>

            <div className={styles.formActions}>
              <SubmitButton className='primaryBtn' text='Save phone' />
              <p className='miniNote'>
                Your driver will use this number to contact you about pickups.
                {!user.phone && (
                  <strong>
                    {" "}
                    You&#39;ll be asked to provide this when booking.
                  </strong>
                )}
              </p>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Password</h2>
          </header>

          {!user.hasPassword ? (
            <div className={styles.disabledBox}>
              <p className={styles.muted}>
                This account doesn&#39;t have a password set (likely a social
                login).
              </p>
              <p className={styles.muted}>
                If you want to support setting a password later, we can add a
                &ldquo;Set password&rdquo; flow safely.
              </p>
            </div>
          ) : (
            <form action={changePassword} className={styles.form}>
              <input type='hidden' name='userId' value={user.id} />

              <label className='label'>
                Current password
                <input
                  name='currentPassword'
                  type='password'
                  className={styles.input}
                  placeholder='Current password'
                  required
                />
              </label>

              <div className={styles.twoCol}>
                <label className='label'>
                  New password
                  <input
                    name='newPassword'
                    type='password'
                    className={styles.input}
                    placeholder='New password'
                    required
                    minLength={8}
                  />
                </label>

                <label className='label'>
                  Confirm new password
                  <input
                    name='confirmPassword'
                    type='password'
                    className={styles.input}
                    placeholder='Confirm'
                    required
                    minLength={8}
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <SubmitButton className='primaryBtn' text='Update password' />
                <p className='miniNote'>
                  Use at least 8 characters. Avoid reusing old passwords.
                </p>
              </div>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
