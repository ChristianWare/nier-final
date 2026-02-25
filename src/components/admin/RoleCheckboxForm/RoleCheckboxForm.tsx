// components/admin/RoleCheckboxForm.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateUserRoles } from "../../../../actions/admin/users";
import styles from "./RoleCheckboxForm.module.css";

// USER is always present — not shown as a toggleable option
const TOGGLEABLE_ROLES = ["DRIVER", "ADMIN"] as const;
type AppRole = "USER" | "DRIVER" | "ADMIN";
type ToggleableRole = (typeof TOGGLEABLE_ROLES)[number];

export default function RoleCheckboxForm({
  userId,
  initialRoles,
  disabled = false,
}: {
  userId: string;
  initialRoles: AppRole[];
  disabled?: boolean;
}) {
  const initial = useMemo(() => {
    const deduped = Array.from(new Set(initialRoles));
    // Always ensure USER is present
    if (!deduped.includes("USER")) deduped.push("USER");
    return deduped;
  }, [initialRoles]);

  const [roles, setRoles] = useState<AppRole[]>(initial);
  const [savingRole, setSavingRole] = useState<ToggleableRole | null>(null);
  const [, startTransition] = useTransition();

  const isDisabled = disabled || savingRole !== null;

  function toggle(role: ToggleableRole) {
    const isOn = roles.includes(role);
    const prev = roles;

    // Always keep USER, toggle the target role
    const next: AppRole[] = isOn
      ? roles.filter((r) => r !== role)
      : [...roles, role];

    // Optimistic update
    setRoles(next);
    setSavingRole(role);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      next.forEach((r) => fd.append("roles", r));

      const res = await updateUserRoles(fd);

      if (res?.error) {
        setRoles(prev);
        toast.error(res.error);
      } else {
        toast.success("Roles updated.");
      }

      setSavingRole(null);
    });
  }

  return (
    <div className={styles.roleList}>
      {TOGGLEABLE_ROLES.map((role) => {
        const isOn = roles.includes(role);
        const isSaving = savingRole === role;

        return (
          <div key={role} className={styles.roleRow}>
            <div className={styles.roleInfo}>
              <span className={styles.roleLabel}>{role}</span>
              <span className={styles.roleDesc}>
                {role === "DRIVER"
                  ? "Can receive trip assignments and access the driver portal."
                  : "Full access to the admin dashboard and all settings."}
              </span>
            </div>

            <button
              type='button'
              role='switch'
              aria-checked={isOn}
              aria-label={`${isOn ? "Remove" : "Grant"} ${role} role`}
              disabled={isDisabled && !isSaving}
              className={`${styles.toggle} ${isOn ? styles.toggleOn : styles.toggleOff}`}
              onClick={() => toggle(role)}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
