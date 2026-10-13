"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./InvoiceDetail.module.css";
import InvoiceAddressFields from "../InvoiceAddressFields/InvoiceAddressFields";
import { adminUpdateInvoiceAddresses } from "../../../../../actions/admin/invoices/invoiceActions";
import { addressLines, type FromAddressMode } from "@/lib/invoice/invoiceAddress";

type Props = {
  invoiceId: string;
  /** What the PDF prints now (saved address, or settings for older invoices). */
  fromAddress: string;
  fromAddressCustom: boolean;
  billToAddress: string | null;
  /** Current Company Settings address, for the "default" option. */
  defaultFromAddress: string;
  /** Unpaid and not void. */
  editable: boolean;
};

export default function InvoiceAddressCard({
  invoiceId,
  fromAddress,
  fromAddressCustom,
  billToAddress,
  defaultFromAddress,
  editable,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState<FromAddressMode>("default");
  const [fromText, setFromText] = useState("");
  const [billToText, setBillToText] = useState("");

  function openEditor() {
    setMode(fromAddressCustom ? "custom" : "default");
    setFromText(fromAddressCustom ? fromAddress : "");
    setBillToText(billToAddress ?? "");
    setOpen(true);
  }

  function save() {
    if (mode === "custom" && !fromText.trim()) {
      toast.error("Enter the address to show, or use the default.");
      return;
    }
    startTransition(async () => {
      const res = await adminUpdateInvoiceAddresses({
        invoiceId,
        fromAddressMode: mode,
        fromAddress: mode === "custom" ? fromText : null,
        billToAddress: billToText,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Addresses updated");
      setOpen(false);
      router.refresh();
    });
  }

  const fromLines = addressLines(fromAddress);
  const billToLines = addressLines(billToAddress);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Addresses</h2>

      <div className={styles.customer}>
        <span className={styles.addressLabel}>
          From{fromAddressCustom ? "" : " (default)"}
        </span>
        {fromLines.length > 0 ? (
          fromLines.map((l, i) => (
            <span key={i} className={styles.customerLine}>
              {l}
            </span>
          ))
        ) : (
          <span className={styles.customerLine}>None</span>
        )}
      </div>

      <div className={styles.customer}>
        <span className={styles.addressLabel}>Bill to</span>
        {billToLines.length > 0 ? (
          billToLines.map((l, i) => (
            <span key={i} className={styles.customerLine}>
              {l}
            </span>
          ))
        ) : (
          <span className={styles.customerLine}>No address</span>
        )}
      </div>

      {editable ? (
        <button
          type='button'
          className={styles.ghostBtn}
          onClick={openEditor}
          disabled={isPending}
        >
          Edit addresses
        </button>
      ) : (
        <span className={styles.customerLine}>
          Paid and voided invoices can&apos;t be edited.
        </span>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Edit addresses</div>
          <InvoiceAddressFields
            defaultFromAddress={defaultFromAddress}
            fromAddressMode={mode}
            onFromAddressModeChange={setMode}
            fromAddress={fromText}
            onFromAddressChange={setFromText}
            billToAddress={billToText}
            onBillToAddressChange={setBillToText}
          />
          <p className='miniNote'>
            If you&apos;ve already sent this invoice, resend it so the customer
            gets the updated PDF.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type='button'
              className='secondaryBtn'
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='goodBtnii'
              onClick={save}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
