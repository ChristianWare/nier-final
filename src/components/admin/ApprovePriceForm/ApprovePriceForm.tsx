"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { approveBookingAndSetPrice } from "../../../../actions/admin/bookings"; 

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
      style={{ display: "grid", gap: 10 }}
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

      <button disabled={isPending} style={btnStyle} type='submit'>
        {isPending ? "Saving..." : "Approve & Set Price"}
      </button>
    </form>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  justifySelf: "start",
};

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {children}
    </div>
  );
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
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.8 }}>{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        style={{
          padding: "0.75rem",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}
