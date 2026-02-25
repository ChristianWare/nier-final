"use client";

import styles from "./EditUserProfileForm.module.css";
import { useTransition, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateUserProfile } from "../../../../actions/admin/users";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Button from "@/components/shared/Button/Button";

interface Props {
  userId: string;
  initialName: string | null;
  initialPhone: string | null;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function EditUserProfileForm({
  userId,
  initialName,
  initialPhone,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState(formatPhone(initialPhone ?? ""));

  const [prevName, setPrevName] = useState(initialName);
  const [prevPhone, setPrevPhone] = useState(initialPhone);

  if (initialName !== prevName) {
    setPrevName(initialName);
    setName(initialName ?? "");
  }
  if (initialPhone !== prevPhone) {
    setPrevPhone(initialPhone);
    setPhone(formatPhone(initialPhone ?? ""));
  }

  const isDirty =
    isEditing &&
    (name.trim() !== (initialName ?? "") ||
      phone.trim() !== formatPhone(initialPhone ?? ""));

  useDirtyForm("edit-user-profile", isDirty, "edit-user-profile-section");

  const handleCancel = useCallback(() => {
    setName(initialName ?? "");
    setPhone(formatPhone(initialPhone ?? ""));
    setIsEditing(false);
  }, [initialName, initialPhone]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("name", name.trim());
    fd.set("phone", phone.trim());

    startTransition(async () => {
      try {
        const result = await updateUserProfile(fd);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Profile updated");
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
        }, 2000);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  // ── Locked state — disabled inputs, no form tag ──
  if (!isEditing) {
    return (
      <div className={styles.lockedWrapper}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              type='text'
              className={`inputBorder ${styles.input}`}
              value={initialName ?? ""}
              disabled
              readOnly
              placeholder='No name set'
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <input
              type='tel'
              className={`inputBorder ${styles.input}`}
              value={formatPhone(initialPhone ?? "")}
              disabled
              readOnly
              placeholder='No phone set'
            />
          </div>
        </div>
        <div className={styles.sectionActionsRow}>
          <Button
            text='Edit Profile'
            btnType='blackReg'
            type='button'
            onClick={() => setIsEditing(true)}
          />
        </div>
      </div>
    );
  }

  // ── Editing / saved state — actual form ──
  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : `${styles.form} ${styles.sectionEditing}`;

  return (
    <form onSubmit={handleSubmit} className={wrapperClass}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`name-${userId}`}>
            Name
          </label>
          <input
            id={`name-${userId}`}
            type='text'
            className={`inputBorder ${styles.input}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Full name'
            disabled={isPending}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`phone-${userId}`}>
            Phone
          </label>
          <input
            id={`phone-${userId}`}
            type='tel'
            className={`inputBorder ${styles.input}`}
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder='(480) 555-0123'
            disabled={isPending}
          />
        </div>
      </div>

      <div className={styles.sectionActionsRow}>
        {justSaved ? (
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        ) : (
          <>
            <Button
              disabled={isPending}
              type='submit'
              text={isPending ? "Saving..." : "Save Changes"}
              btnType='blackReg'
            />
            {!isPending && (
              <Button
                text='Cancel'
                btnType='redReg'
                type='button'
                onClick={handleCancel}
              />
            )}
          </>
        )}
      </div>
    </form>
  );
}
