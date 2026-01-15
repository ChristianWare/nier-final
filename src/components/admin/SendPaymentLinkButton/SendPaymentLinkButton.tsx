"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createPaymentLinkAndEmail } from "../../../../actions/admin/bookings";

export default function SendPaymentLinkButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
    style={{ marginTop: "1rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("bookingId", bookingId);

        startTransition(() => {
          createPaymentLinkAndEmail(fd).then((res) => {
            if (res?.error) return toast.error(res.error);
            toast.success("Payment link emailed");
            router.refresh();
          });
        });
      }}
    >
      <button
        disabled={isPending}
        type='submit'
        className='primaryBtn'
      >
        {isPending ? "Sending..." : "Email payment link"}
      </button>
    </form>
  );
}
