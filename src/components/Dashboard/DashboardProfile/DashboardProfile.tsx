import styles from "./DashboardProfile.module.css";
import Link from "next/link";
import { updateName } from "../../../../actions/auth/updateName"; 
import { changePassword } from "../../../../actions/auth/changePassword"; 
import SubmitButton from "./SubmitButton";
import SignOutButton from "./SignOutButton";

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
    emailVerified: Date | null;
    hasPassword: boolean;
  };
  flash: { ok: string | null; err: string | null };
}) {
  const verifiedLabel = user.emailVerified
    ? `Verified • ${formatDate(user.emailVerified)}`
    : "Not verified";

  return (
    <section className={styles.container} aria-label='Profile and security'>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1 className={`${styles.heading} h2`}>Profile & security</h1>
          <p className={styles.subheading}>
            Update your account details and manage security settings.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link className={styles.secondaryBtn} href='/dashboard'>
            Dashboard
          </Link>
          <Link className={styles.primaryBtn} href='/book'>
            Book a ride
          </Link>
        </div>
      </header>

      {flash.err ? (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          {flash.err}
        </div>
      ) : null}

      {flash.ok ? (
        <div className={`${styles.banner} ${styles.bannerOk}`}>{flash.ok}</div>
      ) : null}

      <div className={styles.grid}>
        {/* Account */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`${styles.cardTitle} h4`}>Account</h2>
          </header>

          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.key}>Email</div>
              <div className={styles.val}>{user.email}</div>
            </div>

            <div className={styles.row}>
              <div className={styles.key}>Status</div>
              <div className={styles.val}>
                <span
                  className={`${styles.pill} ${
                    user.emailVerified ? styles.pillGood : styles.pillWarn
                  }`}
                >
                  {verifiedLabel}
                </span>
              </div>
            </div>

            {!user.emailVerified ? (
              <p className={styles.helpText}>
                If you haven’t verified your email yet, check your inbox for the
                verification link.
              </p>
            ) : null}
          </div>
        </section>

        {/* Update name */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`${styles.cardTitle} h4`}>Display name</h2>
          </header>

          <form action={updateName} className={styles.form}>
            <input type='hidden' name='userId' value={user.id} />

            <label className={styles.label}>
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
              <SubmitButton className={styles.primaryBtn} text='Save name' />
              <p className={styles.miniNote}>
                This is what you’ll see in your dashboard and receipts.
              </p>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`${styles.cardTitle} h4`}>Password</h2>
          </header>

          {!user.hasPassword ? (
            <div className={styles.disabledBox}>
              <p className={styles.muted}>
                This account doesn’t have a password set (likely a social
                login).
              </p>
              <p className={styles.muted}>
                If you want to support setting a password later, we can add a
                “Set password” flow safely.
              </p>
            </div>
          ) : (
            <form action={changePassword} className={styles.form}>
              <input type='hidden' name='userId' value={user.id} />

              <label className={styles.label}>
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
                <label className={styles.label}>
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

                <label className={styles.label}>
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
                <SubmitButton
                  className={styles.primaryBtn}
                  text='Update password'
                />
                <p className={styles.miniNote}>
                  Use at least 8 characters. Avoid reusing old passwords.
                </p>
              </div>
            </form>
          )}
        </section>

        {/* Session */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`${styles.cardTitle} h4`}>Session</h2>
          </header>

          <p className={styles.muted}>
            If you’re using a shared device, sign out when you’re finished.
          </p>

          <div className={styles.sessionActions}>
            <SignOutButton className={styles.secondaryBtn} />
            <Link className={styles.tertiaryBtn} href='/dashboard/support'>
              Support
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
