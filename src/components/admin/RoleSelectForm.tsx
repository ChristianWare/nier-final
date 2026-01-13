"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { updateUserRoles } from "../../../actions/admin/users";

export default function RoleSelectForm({
  // userId,
  currentRole,
}: {
  userId: string;
  currentRole: "USER" | "DRIVER" | "ADMIN";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const form = e.currentTarget;
        const fd = new FormData(form);
        // fd.set("userId", userId);

        startTransition(() => {
          updateUserRoles(fd).then((res) => {
            if (res?.error) {
              toast.error(res.error);
              return;
            }
            toast.success("Role updated");
            router.refresh();
          });
        });
      }}
      style={{ display: "flex", gap: 10, alignItems: "center" }}
    >
      <select name='roles' defaultValue={currentRole} disabled={isPending}>
        <option value='USER'>USER</option>
        <option value='DRIVER'>DRIVER</option>
        <option value='ADMIN'>ADMIN</option>
      </select>

      <button type='submit' disabled={isPending} style={{ cursor: "pointer" }}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
