/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./DashboardProfile.module.css";
import { useState, useMemo, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/shared/Button/Button";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import {
  updateProfileName,
  updateProfilePhone,
  updateProfileEmail,
  updateProfilePassword,
} from "../../../../actions/auth/profileActions";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default function DashboardProfile({
  user,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    emailVerified: string | null;
    hasPassword: boolean;
  };
}) {
  const router = useRouter();

  /* ══════════════════════════════════════════════
     ACCOUNT / EMAIL SECTION
     ══════════════════════════════════════════════ */

  const [emailEditing, setEmailEditing] = useState(false);
  const [emailJustSaved, setEmailJustSaved] = useState(false);
  const [emailPending, startEmailTransition] = useTransition();

  const [email, setEmail] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState("");

  const emailLocked = !emailEditing;
  const emailDisabled = emailLocked || emailPending;

  const emailSectionClass = emailJustSaved
    ? `${styles.card} ${styles.sectionSaved}`
    : emailEditing
      ? `${styles.card} ${styles.sectionEditing}`
      : `${styles.card} ${styles.sectionLocked}`;

  // Dirty tracking — email
  const emailChangedFields = useMemo(() => {
    const fields: string[] = [];
    if (email !== user.email) fields.push("Email Address");
    if (emailPassword) fields.push("Password (for verification)");
    return fields;
  }, [email, emailPassword, user.email]);

  useDirtyForm(
    "email-settings",
    emailEditing && emailChangedFields.length > 0,
    "email-section",
    emailChangedFields,
  );

  const handleEmailCancel = useCallback(() => {
    setEmail(user.email);
    setEmailPassword("");
    setEmailEditing(false);
  }, [user.email]);

  function handleEmailSave() {
    startEmailTransition(async () => {
      const res = await updateProfileEmail(user.id, email, emailPassword);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Email updated. Please verify your new address.");
      setEmailPassword("");
      setEmailJustSaved(true);
      setTimeout(() => {
        setEmailJustSaved(false);
        setEmailEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  const renderEmailActions = () => {
    if (emailJustSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (emailEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={emailPending}
            type='button'
            text={emailPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handleEmailSave}
          />
          {!emailPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleEmailCancel}
            />
          )}
        </div>
      );
    }

    if (!user.hasPassword) return null;

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Email'
          btnType='blackReg'
          type='button'
          onClick={() => setEmailEditing(true)}
        />
      </div>
    );
  };

  /* ══════════════════════════════════════════════
     DISPLAY NAME SECTION
     ══════════════════════════════════════════════ */

  const [nameEditing, setNameEditing] = useState(false);
  const [nameJustSaved, setNameJustSaved] = useState(false);
  const [namePending, startNameTransition] = useTransition();

  const [name, setName] = useState(user.name ?? "");

  const nameLocked = !nameEditing;
  const nameDisabled = nameLocked || namePending;

  const nameSectionClass = nameJustSaved
    ? `${styles.card} ${styles.sectionSaved}`
    : nameEditing
      ? `${styles.card} ${styles.sectionEditing}`
      : `${styles.card} ${styles.sectionLocked}`;

  // Dirty tracking — name
  const nameChangedFields = useMemo(() => {
    const fields: string[] = [];
    if (name !== (user.name ?? "")) fields.push("Display Name");
    return fields;
  }, [name, user.name]);

  useDirtyForm(
    "display-name",
    nameEditing && nameChangedFields.length > 0,
    "name-section",
    nameChangedFields,
  );

  const handleNameCancel = useCallback(() => {
    setName(user.name ?? "");
    setNameEditing(false);
  }, [user.name]);

  function handleNameSave() {
    startNameTransition(async () => {
      const res = await updateProfileName(user.id, name);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Name updated.");
      setNameJustSaved(true);
      setTimeout(() => {
        setNameJustSaved(false);
        setNameEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  const renderNameActions = () => {
    if (nameJustSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (nameEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={namePending}
            type='button'
            text={namePending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handleNameSave}
          />
          {!namePending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleNameCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Name'
          btnType='blackReg'
          type='button'
          onClick={() => setNameEditing(true)}
        />
      </div>
    );
  };

  /* ══════════════════════════════════════════════
     PHONE SECTION
     ══════════════════════════════════════════════ */

  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneJustSaved, setPhoneJustSaved] = useState(false);
  const [phonePending, startPhoneTransition] = useTransition();

  const [phone, setPhone] = useState(user.phone ?? "");

  const phoneLocked = !phoneEditing;
  const phoneDisabled = phoneLocked || phonePending;

  const phoneSectionClass = phoneJustSaved
    ? `${styles.card} ${styles.sectionSaved}`
    : phoneEditing
      ? `${styles.card} ${styles.sectionEditing}`
      : `${styles.card} ${styles.sectionLocked}`;

  // Dirty tracking — phone
  const phoneChangedFields = useMemo(() => {
    const fields: string[] = [];
    if (phone !== (user.phone ?? "")) fields.push("Phone Number");
    return fields;
  }, [phone, user.phone]);

  useDirtyForm(
    "phone-number",
    phoneEditing && phoneChangedFields.length > 0,
    "phone-section",
    phoneChangedFields,
  );

  const handlePhoneCancel = useCallback(() => {
    setPhone(user.phone ?? "");
    setPhoneEditing(false);
  }, [user.phone]);

  function handlePhoneSave() {
    startPhoneTransition(async () => {
      const res = await updateProfilePhone(user.id, phone);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Phone number updated.");
      setPhoneJustSaved(true);
      setTimeout(() => {
        setPhoneJustSaved(false);
        setPhoneEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  const renderPhoneActions = () => {
    if (phoneJustSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (phoneEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={phonePending}
            type='button'
            text={phonePending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handlePhoneSave}
          />
          {!phonePending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handlePhoneCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Phone'
          btnType='blackReg'
          type='button'
          onClick={() => setPhoneEditing(true)}
        />
      </div>
    );
  };

  /* ══════════════════════════════════════════════
     PASSWORD SECTION
     ══════════════════════════════════════════════ */

  const [pwEditing, setPwEditing] = useState(false);
  const [pwJustSaved, setPwJustSaved] = useState(false);
  const [pwPending, startPwTransition] = useTransition();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const pwSectionClass = pwJustSaved
    ? `${styles.card} ${styles.sectionSaved}`
    : pwEditing
      ? `${styles.card} ${styles.sectionEditing}`
      : `${styles.card} ${styles.sectionLocked}`;

  // Dirty tracking — password
  const pwChangedFields = useMemo(() => {
    const fields: string[] = [];
    if (currentPw) fields.push("Current Password");
    if (newPw) fields.push("New Password");
    if (confirmPw) fields.push("Confirm Password");
    return fields;
  }, [currentPw, newPw, confirmPw]);

  useDirtyForm(
    "password",
    pwEditing && pwChangedFields.length > 0,
    "password-section",
    pwChangedFields,
  );

  const handlePwCancel = useCallback(() => {
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwEditing(false);
  }, []);

  function handlePwSave() {
    startPwTransition(async () => {
      const res = await updateProfilePassword(
        user.id,
        currentPw,
        newPw,
        confirmPw,
      );

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Password updated.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwJustSaved(true);
      setTimeout(() => {
        setPwJustSaved(false);
        setPwEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  const renderPwActions = () => {
    if (!user.hasPassword) return null;

    if (pwJustSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (pwEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={pwPending}
            type='button'
            text={pwPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handlePwSave}
          />
          {!pwPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handlePwCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Change Password'
          btnType='blackReg'
          type='button'
          onClick={() => setPwEditing(true)}
        />
      </div>
    );
  };

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  const verifiedLabel = user.emailVerified
    ? `Verified • ${formatDate(user.emailVerified)}`
    : "Not verified";

  return (
    <section className='container' aria-label='Profile and security'>
      <header className='header'>
        <h1 className='heading h2'>Profile &amp; security</h1>
        <p className='subheading'>
          Update your account details and manage security settings.
        </p>
      </header>

      <div className={styles.grid}>
        {/* ─── Account / Email ─── */}
        <section className={emailSectionClass} id='email-section'>
          <header className={styles.cardTop}>
            <h2 className='cardTitle h4'>Account</h2>
          </header>

          {/* Always-visible info rows */}
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

            {!user.emailVerified && (
              <p className={styles.helpText}>
                If you haven&apos;t verified your email yet, check your inbox
                for the verification link.
              </p>
            )}
          </div>

          {/* Editable email fields — only show when editing */}
          {emailEditing && (
            <div className={styles.editEmailFields}>
              <label className='label'>
                New email address
                <input
                  type='email'
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='newemail@example.com'
                  disabled={emailPending}
                />
              </label>

              <label className='label'>
                Current password
                <input
                  type='password'
                  className={styles.input}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder='Enter your current password'
                  disabled={emailPending}
                />
              </label>

              <p className={styles.warningNote}>
                Changing your email will reset your verification status. You
                will need to verify the new address.
              </p>
            </div>
          )}

          {renderEmailActions()}
        </section>

        {/* ─── Display Name ─── */}
        <section className={nameSectionClass} id='name-section'>
          <header className={styles.cardTop}>
            <h2 className='cardTitle h4'>Display name</h2>
          </header>

          <div className={styles.formFields}>
            <label className='label'>
              Name
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Your name'
                maxLength={60}
                disabled={nameDisabled}
              />
            </label>

            <p className='miniNote'>
              This is what you&apos;ll see in your dashboard and receipts.
            </p>
          </div>

          {renderNameActions()}
        </section>

        {/* ─── Phone ─── */}
        <section className={phoneSectionClass} id='phone-section'>
          <header className={styles.cardTop}>
            <h2 className='cardTitle h4'>Phone number</h2>
          </header>

          <div className={styles.formFields}>
            <label className='label'>
              Phone
              <input
                type='tel'
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='(602) 555-1234'
                maxLength={20}
                disabled={phoneDisabled}
              />
            </label>

            <p className='miniNote'>
              Your driver will use this number to contact you about pickups.
              {!user.phone && (
                <strong>
                  {" "}
                  You&apos;ll be asked to provide this when booking.
                </strong>
              )}
            </p>
          </div>

          {renderPhoneActions()}
        </section>

        {/* ─── Password ─── */}
        <section className={pwSectionClass} id='password-section'>
          <header className={styles.cardTop}>
            <h2 className='cardTitle h4'>Password</h2>
          </header>

          {!user.hasPassword ? (
            <div className={styles.disabledBox}>
              <p className={styles.muted}>
                This account doesn&apos;t have a password set (likely a social
                login).
              </p>
              <p className={styles.muted}>
                If you want to support setting a password later, we can add a
                &ldquo;Set password&rdquo; flow safely.
              </p>
            </div>
          ) : (
            <>
              {/* Locked state: just a note */}
              {!pwEditing && !pwJustSaved && (
                <div className={styles.formFields}>
                  <p className='miniNote'>
                    Your password is set. Click below to change it.
                  </p>
                </div>
              )}

              {/* Editing state: password fields */}
              {pwEditing && (
                <div className={styles.formFields}>
                  <label className='label'>
                    Current password
                    <input
                      type='password'
                      className={styles.input}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder='Current password'
                      disabled={pwPending}
                    />
                  </label>

                  <div className={styles.twoCol}>
                    <label className='label'>
                      New password
                      <input
                        type='password'
                        className={styles.input}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder='New password'
                        disabled={pwPending}
                      />
                    </label>

                    <label className='label'>
                      Confirm new password
                      <input
                        type='password'
                        className={styles.input}
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder='Confirm'
                        disabled={pwPending}
                      />
                    </label>
                  </div>

                  <p className='miniNote'>
                    Use at least 8 characters with one uppercase letter and one
                    number.
                  </p>
                </div>
              )}

              {/* Saved state: confirmation note */}
              {pwJustSaved && (
                <div className={styles.formFields}>
                  <p className='miniNote'>Password has been updated.</p>
                </div>
              )}
            </>
          )}

          {renderPwActions()}
        </section>
      </div>
    </section>
  );
}
