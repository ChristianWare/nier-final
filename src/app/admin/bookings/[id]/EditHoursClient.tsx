"use client";

import { useState } from "react";
import { updateHoursRequested } from "../../../../../actions/admin/updateHoursRequested"; 
import toast from "react-hot-toast";
import styles from "./EditHoursClient.module.css";

type Props = {
  bookingId: string;
  currentHours: number | null;
};

export default function EditHoursClient({ bookingId, currentHours }: Props) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(String(currentHours ?? ""));
  const [saving, setSaving] = useState(false);

  function handleCancel() {
    setEditing(false);
    setHours(String(currentHours ?? ""));
  }

  async function handleSave() {
    const h = parseFloat(hours);
    if (isNaN(h) || h < 0.5 || h > 96) {
      toast.error("Enter a valid number of hours (0.5 – 96).");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append("bookingId", bookingId);
    fd.append("hoursRequested", String(h));
    const result = await updateHoursRequested(fd);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      const total = ((result.newTotalCents ?? 0) / 100).toLocaleString(
        "en-US",
        { style: "currency", currency: "USD" },
      );
      toast.success(
        `Hours updated · ${result.billedHours} billed hrs · New total ${total}`,
      );
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        type='button'
        onClick={() => setEditing(true)}
        className={styles.editBtn}
      >
        ✏️ Edit Hours
      </button>
    );
  }

  return (
    <div className={styles.row}>
      <label className={styles.label}>Hours requested</label>
      <div className={styles.controls}>
        <input
          type='number'
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          min={0.5}
          max={96}
          step={0.5}
          className={styles.input}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <span className={styles.unit}>hrs</span>
        <button
          type='button'
          onClick={handleSave}
          disabled={saving}
          className={styles.saveBtn}
        >
          {saving ? "Saving…" : "Save & Recalculate"}
        </button>
        <button
          type='button'
          onClick={handleCancel}
          disabled={saving}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
      </div>
      <p className={styles.hint}>
        Price will be recalculated automatically. Driver pay will adjust
        proportionally if assigned.
      </p>
    </div>
  );
}
