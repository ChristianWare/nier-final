// components/admin/RoleCheckboxForm.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateUserRoles } from "../../../../actions/admin/users";

const ALL_ROLES = ["USER", "DRIVER", "ADMIN"] as const;
type AppRole = (typeof ALL_ROLES)[number];

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
    return deduped.length > 0 ? deduped : (["USER"] as AppRole[]);
  }, [initialRoles]);

  const [roles, setRoles] = useState<AppRole[]>(initial);
  const [isPending, startTransition] = useTransition();

  const isDisabled = disabled || isPending;

  function toggle(role: AppRole, checked: boolean) {
    const prev = roles;

    const next = checked
      ? Array.from(new Set([...roles, role]))
      : roles.filter((r) => r !== role);

    if (next.length === 0) {
      toast.error("User must have at least 1 role.");
      return;
    }

    // optimistic UI
    setRoles(next);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      next.forEach((r) => fd.append("roles", r));

      const res = await updateUserRoles(fd);

      if (res?.error) {
        setRoles(prev); // revert
        toast.error(res.error);
        return;
      }

      toast.success("Roles updated.");
    });
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {ALL_ROLES.map((r) => {
        const checked = roles.includes(r);

        return (
          <label
            key={r}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: isDisabled ? 0.6 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
              userSelect: "none",
            }}
          >
            <input
              type='checkbox'
              checked={checked}
              disabled={isDisabled}
              onChange={(e) => toggle(r, e.target.checked)}
            />
            <span>{r}</span>
          </label>
        );
      })}
    </div>
  );
}
