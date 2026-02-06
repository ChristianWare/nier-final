// src/app/set-password/SetPasswordFormClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCorporatePassword } from "../../../../actions/corporate/setPassword";
import styles from "./SetPasswordForm.module.css";

type Props = {
  token: string;
  isValidToken: boolean;
  email?: string;
  name?: string;
};

export default function SetPasswordFormClient({
  token,
  isValidToken,
  email,
  name,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const firstName = (name || "").split(" ")[0];

  // ─── Password requirement checks ───
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const allValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) return;

    setError("");

    startTransition(async () => {
      const res = await setCorporatePassword(token, password);
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  // ─── Token expired or invalid ───
  if (!isValidToken) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <span className={styles.iconEmoji}>⚠️</span>
          </div>
          <h1 className={styles.title}>Link Expired</h1>
          <p className={styles.subtitle}>
            This password setup link is invalid or has expired. Please contact
            Nier Transportation and we&apos;ll send you a new one.
          </p>
          <a href='mailto:info@niertransportation.com' className={styles.btn}>
            Contact Us
          </a>
        </div>
      </div>
    );
  }

  // ─── Success state ───
  if (success) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <span className={styles.iconEmoji}>✅</span>
          </div>
          <h1 className={styles.title}>Password Set!</h1>
          <p className={styles.subtitle}>
            Your password has been created. You can now log in to access your
            corporate dashboard.
          </p>
          <button className={styles.btn} onClick={() => router.push("/login")}>
            Log In →
          </button>
        </div>
      </div>
    );
  }

  // ─── Password form ───
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.iconCircle}>
          <span className={styles.iconEmoji}>🔐</span>
        </div>
        <h1 className={styles.title}>
          {firstName ? `Welcome, ${firstName}!` : "Set Your Password"}
        </h1>
        <p className={styles.subtitle}>
          {email ? (
            <>
              Create a password for <strong>{email}</strong> to access your
              corporate dashboard.
            </>
          ) : (
            "Create a password to access your corporate dashboard."
          )}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor='password' className={styles.label}>
              Password
            </label>
            <input
              id='password'
              type='password'
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Create a password'
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor='confirmPassword' className={styles.label}>
              Confirm Password
            </label>
            <input
              id='confirmPassword'
              type='password'
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='Confirm your password'
              disabled={isPending}
            />
          </div>

          {/* Password requirements checklist */}
          <div className={styles.requirements}>
            <div
              className={`${styles.req} ${password.length > 0 ? (hasMinLength ? styles.reqMet : styles.reqFail) : ""}`}
            >
              <span className={styles.reqIcon}>{hasMinLength ? "✓" : "○"}</span>
              At least 8 characters
            </div>
            <div
              className={`${styles.req} ${password.length > 0 ? (hasUppercase ? styles.reqMet : styles.reqFail) : ""}`}
            >
              <span className={styles.reqIcon}>{hasUppercase ? "✓" : "○"}</span>
              One uppercase letter
            </div>
            <div
              className={`${styles.req} ${password.length > 0 ? (hasNumber ? styles.reqMet : styles.reqFail) : ""}`}
            >
              <span className={styles.reqIcon}>{hasNumber ? "✓" : "○"}</span>
              One number
            </div>
            <div
              className={`${styles.req} ${confirmPassword.length > 0 ? (passwordsMatch ? styles.reqMet : styles.reqFail) : ""}`}
            >
              <span className={styles.reqIcon}>
                {passwordsMatch ? "✓" : "○"}
              </span>
              Passwords match
            </div>
          </div>

          <button
            type='submit'
            className={styles.btn}
            disabled={!allValid || isPending}
          >
            {isPending ? "Setting Password..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
