"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import {
  deleteDiscountCode,
  setDiscountCodeActive,
} from "../../../../actions/admin/discountCodes";
import own from "./DiscountCodes.module.css";

/** Copy the share link, turn the code on or off, or delete an unused code.
 *  Turning off and deleting ask first. */
export default function CodeActions({
  id,
  code,
  active,
  used,
}: {
  id: string;
  code: string;
  active: boolean;
  used: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"off" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();
  const close = () => setConfirm(null);

  async function copyLink() {
    const link = `${window.location.origin}/book?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Share link copied.");
    } catch {
      toast(`Couldn't copy automatically. Here's the link: ${link}`, {
        duration: 8000,
      });
    }
  }

  function setActive(next: boolean) {
    startTransition(async () => {
      const res = await setDiscountCodeActive(id, next);
      close();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? `${code} is turned on.` : `${code} is turned off.`);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteDiscountCode(id);
      close();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`${code} was deleted.`);
      router.push("/admin/discount-codes");
    });
  }

  return (
    <>
      <div className={own.actions}>
        <Button btnType='greenReg' text='Copy share link' onClick={copyLink} />
        {active ? (
          <Button
            btnType='grayReg'
            text='Turn off'
            onClick={() => setConfirm("off")}
            disabled={isPending}
          />
        ) : (
          <Button
            btnType='greenReg'
            text='Turn on'
            onClick={() => setActive(true)}
            disabled={isPending}
          />
        )}
        {!used ? (
          <Button
            btnType='redReg'
            text='Delete'
            onClick={() => setConfirm("delete")}
            disabled={isPending}
          />
        ) : null}
      </div>

      <Modal isOpen={confirm === "off"} onClose={close}>
        <div className={own.modalTitle}>Turn off {code}?</div>
        <div className={own.modalBody}>
          <p className='miniNote'>
            Customers won&apos;t be able to use it until you turn it back on.
            Bookings that already used it keep their discount.
          </p>
        </div>
        <div className={own.modalActions}>
          <Button
            btnType='grayReg'
            text='Cancel'
            onClick={close}
            disabled={isPending}
          />
          <Button
            btnType='redReg'
            text={isPending ? "Turning off…" : "Yes, turn it off"}
            onClick={() => setActive(false)}
            disabled={isPending}
          />
        </div>
      </Modal>

      <Modal isOpen={confirm === "delete"} onClose={close}>
        <div className={own.modalTitle}>Delete {code}?</div>
        <div className={own.modalBody}>
          <p className='miniNote'>
            This can&apos;t be undone. Nobody has used this code yet.
          </p>
        </div>
        <div className={own.modalActions}>
          <Button
            btnType='grayReg'
            text='Cancel'
            onClick={close}
            disabled={isPending}
          />
          <Button
            btnType='redReg'
            text={isPending ? "Deleting…" : "Yes, delete it"}
            onClick={remove}
            disabled={isPending}
          />
        </div>
      </Modal>
    </>
  );
}
