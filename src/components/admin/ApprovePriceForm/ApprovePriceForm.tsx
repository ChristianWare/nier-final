"use client";

import styles from "./ApprovePriceForm.module.css";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { approveBookingAndSetPrice } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

export default function ApprovePriceForm({
  bookingId,
  currency,
  subtotalCents,
  feesCents,
  taxesCents,
  totalCents,
}: {
  bookingId: string;
  currency: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("bookingId", bookingId);

        startTransition(() => {
          approveBookingAndSetPrice(fd).then((res) => {
            if (res?.error) return toast.error(res.error);
            toast.success("Approved and price saved");
            router.refresh();
          });
        });
      }}
    >
      <input type='hidden' name='currency' defaultValue={currency} />

      <Grid2>
        <Field
          label='Subtotal (cents)'
          name='subtotalCents'
          defaultValue={String(subtotalCents)}
          disabled={isPending}
        />
        <Field
          label='Fees (cents)'
          name='feesCents'
          defaultValue={String(feesCents)}
          disabled={isPending}
        />
      </Grid2>

      <Grid2>
        <Field
          label='Taxes (cents)'
          name='taxesCents'
          defaultValue={String(taxesCents)}
          disabled={isPending}
        />
        <Field
          label='Total (cents)'
          name='totalCents'
          defaultValue={String(totalCents)}
          disabled={isPending}
        />
      </Grid2>

      <div className={styles.btnContainer}>
        <Button
          disabled={isPending}
          type='submit'
          text={isPending ? "Saving..." : "Approve & Set Price"}
          btnType='black'
          arrow
        />
      </div>
    </form>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid2}>{children}</div>;
}

function Field({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className='emptyTitle'>{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className={styles.input}
      />
    </div>
  );
}
