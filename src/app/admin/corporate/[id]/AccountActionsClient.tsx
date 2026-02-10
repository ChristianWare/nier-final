"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateAccountDetailPage.module.css";
import Modal from "@/components/shared/Modal/Modal";
import {
  updateAccountStatus,
  updateCorporateAccount,
  addCorporatePassenger,
  togglePassengerActive,
  resendCorporateWelcomeEmail,
} from "../../../../../actions/corporate/corporateAdminActions";
import Button from "@/components/shared/Button/Button";

/* ─────────────────────────────────────────────
   Edit Payment Settings (inline toggle)
   ───────────────────────────────────────────── */

export function EditPaymentSettingsClient({
  accountId,
  currentBillingCycle,
  currentPaymentMethod,
  currentPaymentTerms,
  currentDiscountPercent,
  currentMonthlyLimitCents,
  currentCheckPayableTo,
}: {
  accountId: string;
  currentBillingCycle: string;
  currentPaymentMethod: string;
  currentPaymentTerms: string;
  currentDiscountPercent: number | null;
  currentMonthlyLimitCents: number | null;
  currentCheckPayableTo: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  // Form state
  const [billingCycle, setBillingCycle] = useState(currentBillingCycle);
  const [paymentMethod, setPaymentMethod] = useState(currentPaymentMethod);
  const [paymentTerms, setPaymentTerms] = useState(currentPaymentTerms);
  const [discountPercent, setDiscountPercent] = useState(
    currentDiscountPercent != null ? String(currentDiscountPercent) : "",
  );
  const [monthlyLimit, setMonthlyLimit] = useState(
    currentMonthlyLimitCents != null
      ? (currentMonthlyLimitCents / 100).toFixed(2)
      : "",
  );
  const [checkPayableTo, setCheckPayableTo] = useState(
    currentCheckPayableTo ?? "",
  );

  function handleCancel() {
    // Reset to current values
    setBillingCycle(currentBillingCycle);
    setPaymentMethod(currentPaymentMethod);
    setPaymentTerms(currentPaymentTerms);
    setDiscountPercent(
      currentDiscountPercent != null ? String(currentDiscountPercent) : "",
    );
    setMonthlyLimit(
      currentMonthlyLimitCents != null
        ? (currentMonthlyLimitCents / 100).toFixed(2)
        : "",
    );
    setCheckPayableTo(currentCheckPayableTo ?? "");
    setEditing(false);
  }

  function handleSave() {
    const discountVal = discountPercent.trim()
      ? parseFloat(discountPercent)
      : null;
    if (discountVal !== null && (discountVal < 0 || discountVal > 100)) {
      toast.error("Discount must be between 0 and 100.");
      return;
    }

    const limitCents = monthlyLimit.trim()
      ? Math.round(parseFloat(monthlyLimit) * 100)
      : null;
    if (limitCents !== null && limitCents < 0) {
      toast.error("Monthly limit cannot be negative.");
      return;
    }

    startTransition(async () => {
      const res = await updateCorporateAccount(accountId, {
        billingCycle: billingCycle as "MONTHLY" | "WEEKLY" | "PER_RIDE",
        paymentMethod: paymentMethod as "INVOICE" | "CHECK" | "CARD_ON_FILE",
        paymentTerms: paymentTerms as
          | "NET_15"
          | "NET_30"
          | "NET_45"
          | "DUE_ON_RECEIPT",
        discountPercent: discountVal,
        monthlyLimitCents: limitCents,
      });

      if (res.ok) {
        toast.success("Payment settings updated.");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update settings.");
      }
    });
  }

  if (!editing) {
    return (
      <Button
        onClick={() => setEditing(true)}
        type='button'
        text='Edit Payment Settings'
        btnType='blackReg'
      />
    );
  }

  return (
    <div className={styles.editPaymentSection}>
      <div className={styles.editPaymentGrid}>
        {/* Billing Cycle */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Billing Cycle</label>
          <select
            className='inputBorder'
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value)}
            disabled={isPending}
          >
            <option value='MONTHLY'>Monthly</option>
            <option value='WEEKLY'>Weekly</option>
            <option value='PER_RIDE'>Per Ride</option>
          </select>
        </div>

        {/* Payment Method */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Payment Method</label>
          <select
            className='inputBorder'
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={isPending}
          >
            <option value='INVOICE'>Electronic Invoice</option>
            <option value='CHECK'>Physical Check</option>
            <option value='CARD_ON_FILE'>Card on File</option>
          </select>
        </div>

        {/* Payment Terms */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Payment Terms</label>
          <select
            className='inputBorder'
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            disabled={isPending}
          >
            <option value='NET_15'>NET 15</option>
            <option value='NET_30'>NET 30</option>
            <option value='NET_45'>NET 45</option>
            <option value='DUE_ON_RECEIPT'>Due on Receipt</option>
          </select>
        </div>

        {/* Discount */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Discount (%)</label>
          <input
            type='text'
            inputMode='decimal'
            className='inputBorder'
            value={discountPercent}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              setDiscountPercent(val);
            }}
            placeholder='e.g. 10'
            disabled={isPending}
          />
        </div>

        {/* Monthly Limit */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Monthly Limit ($)</label>
          <input
            type='text'
            inputMode='decimal'
            className='inputBorder'
            value={monthlyLimit}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              setMonthlyLimit(val);
            }}
            placeholder='Leave empty for no limit'
            disabled={isPending}
          />
        </div>

        {/* Check Payable To — only if method is CHECK */}
        {paymentMethod === "CHECK" && (
          <div className={styles.formField}>
            <label className={styles.formLabel}>Check Payable To</label>
            <input
              type='text'
              className='inputBorder'
              value={checkPayableTo}
              onChange={(e) => setCheckPayableTo(e.target.value)}
              placeholder='e.g. Nier Transportation LLC'
              disabled={isPending}
            />
          </div>
        )}
      </div>

      <div className={styles.editPaymentActions}>
        <button className='goodBtnii' onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </button>
        <button
          className='neutralBtn'
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Account Status Actions (with Modals)
   ───────────────────────────────────────────── */

export function AccountStatusClient({
  accountId,
  currentStatus,
  primaryContactHasPassword,
}: {
  accountId: string;
  currentStatus: string;
  primaryContactHasPassword: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  // Close account confirmation
  const [confirmText, setConfirmText] = useState("");
  const [ack, setAck] = useState(false);
  const canClose = confirmText.toUpperCase() === "CLOSE" && ack;

  function handleStatusChange(newStatus: "ACTIVE" | "SUSPENDED" | "CLOSED") {
    startTransition(async () => {
      const res = await updateAccountStatus(accountId, newStatus);
      if (res.ok) {
        const labels: Record<string, string> = {
          ACTIVE: "reactivated",
          SUSPENDED: "suspended",
          CLOSED: "closed",
        };
        toast.success(`Account ${labels[newStatus]}.`);
        setSuspendOpen(false);
        setCloseOpen(false);
        setConfirmText("");
        setAck(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  function handleResendWelcome() {
    if (
      !window.confirm(
        "Resend the welcome email with a new password setup link?",
      )
    )
      return;

    startTransition(async () => {
      const res = await resendCorporateWelcomeEmail(accountId);
      if (res.ok) {
        toast.success("Welcome email sent! Link is valid for 48 hours.");
      } else {
        toast.error(res.error ?? "Failed to send email.");
      }
    });
  }

  return (
    <>
      <div className={`${styles.card} ${styles.dangerCard}`}>
        <div className={styles.dangerTop}>
          <div className='cardTitle h4'>Account Status</div>
          <p className='subheading'>
            Manage the status of this corporate account.
          </p>
        </div>

        {/* Resend welcome email */}
        {!primaryContactHasPassword && (
          <div className={styles.resendRow}>
            <div className={styles.resendInfo}>
              <span className={styles.resendLabel}>⚠️ Password not set</span>
              <span className={styles.resendCopy}>
                The primary contact hasn&apos;t set their password yet. Resend
                the welcome email with a new setup link.
              </span>
            </div>
            <button
              className='primaryBtn'
              onClick={handleResendWelcome}
              disabled={isPending}
            >
              {isPending ? "Sending..." : "Resend Welcome Email"}
            </button>
          </div>
        )}

        <div className={styles.actionsRow}>
          {currentStatus !== "ACTIVE" && (
            <button
              className='goodBtn'
              onClick={() => handleStatusChange("ACTIVE")}
              disabled={isPending}
            >
              {isPending ? "Updating..." : "Reactivate"}
            </button>
          )}
          {currentStatus !== "SUSPENDED" && currentStatus !== "CLOSED" && (
            <button
              className='warningBtn'
              onClick={() => setSuspendOpen(true)}
              disabled={isPending}
            >
              Suspend
            </button>
          )}
          {currentStatus !== "CLOSED" && (
            <button
              className='dangerBtn'
              onClick={() => setCloseOpen(true)}
              disabled={isPending}
            >
              Close Account
            </button>
          )}
        </div>
      </div>

      {/* ─── Suspend Modal ─── */}
      <Modal isOpen={suspendOpen} onClose={() => setSuspendOpen(false)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Suspend this account?</div>

          <p className='paragraph'>
            You are about to <strong>suspend</strong> this corporate account.
          </p>

          <div className={styles.suspendImpactBox}>
            <strong>⚠️ What happens when suspended:</strong>
            <ul className={styles.impactList}>
              <li>Corporate contacts will not be able to book new rides</li>
              <li>Existing scheduled rides will remain active</li>
              <li>Outstanding invoices will still be due</li>
              <li>You can reactivate the account at any time</li>
            </ul>
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setSuspendOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='warningBtn'
              onClick={() => handleStatusChange("SUSPENDED")}
              disabled={isPending}
            >
              {isPending ? "Suspending..." : "Yes, Suspend Account"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Close Account Modal ─── */}
      <Modal
        isOpen={closeOpen}
        onClose={() => {
          setCloseOpen(false);
          setConfirmText("");
          setAck(false);
        }}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Close this account?</div>

          <p className='paragraph'>
            You are about to <strong>permanently close</strong> this corporate
            account.
            <br />
            <span className={styles.modalSubnote}>
              This should only be done when the business relationship has ended.
            </span>
          </p>

          <div className={styles.closeImpactBox}>
            <strong>🚨 What happens when closed:</strong>
            <ul className={styles.impactList}>
              <li>Corporate contacts will lose all access immediately</li>
              <li>No new rides can be booked for this account</li>
              <li>Outstanding invoices will still be due</li>
              <li>
                This action can be reversed by reactivating, but is intended to
                be permanent
              </li>
            </ul>
          </div>

          <div className={styles.confirmBlock}>
            <label className={styles.confirmLabel}>
              Type <strong>CLOSE</strong> to confirm
            </label>
            <input
              className='inputBorder'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type CLOSE'
              autoComplete='off'
            />

            <label className={styles.confirmCheckboxRow}>
              <input
                type='checkbox'
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span>
                I understand this will revoke access for all corporate contacts.
              </span>
            </label>
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => {
                setCloseOpen(false);
                setConfirmText("");
                setAck(false);
              }}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='dangerBtn'
              onClick={() => handleStatusChange("CLOSED")}
              disabled={isPending || !canClose}
            >
              {isPending ? "Closing..." : "Confirm Close Account"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ─────────────────────────────────────────────
   Add Passenger
   ───────────────────────────────────────────── */

export function AddPassengerClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setDepartment("");
    setEmployeeId("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    startTransition(async () => {
      const res = await addCorporatePassenger(accountId, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        employeeId: employeeId.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Passenger added.");
        setModalOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to add passenger.");
      }
    });
  }

  return (
    <>
      {/* <button className='neutralBtn' onClick={() => setModalOpen(true)}>
        + Add Passenger
      </button> */}
      <Button
        onClick={() => setModalOpen(true)}
        type='button'
        text='+ Add Passenger'
        btnType='blackReg'
      />

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <div className={styles.modalContent}>
            <h3 className='h4'>Add Passenger</h3>
            <p className='subheading'>
              Add someone to the passenger roster for this account.
            </p>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Name *</label>
                <input
                  type='text'
                  className='inputBorder'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Full name'
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Email</label>
                <input
                  type='email'
                  className='inputBorder'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='email@example.com'
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Phone</label>
                <input
                  type='tel'
                  className='inputBorder'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder='(555) 123-4567'
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Department</label>
                <input
                  type='text'
                  className='inputBorder'
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder='e.g. Marketing'
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Employee ID</label>
                <input
                  type='text'
                  className='inputBorder'
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder='Internal ID'
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className='goodBtnii'
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? "Adding..." : "Add Passenger"}
              </button>
              <button
                className='neutralBtn'
                onClick={() => setModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Toggle Passenger Active
   ───────────────────────────────────────────── */

export function TogglePassengerBtn({
  passengerId,
  passengerName,
  active,
}: {
  passengerId: string;
  passengerName: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  function handle() {
    startTransition(async () => {
      const res = await togglePassengerActive(passengerId, !active);
      if (res.ok) {
        toast.success(
          active ? "Passenger deactivated." : "Passenger reactivated.",
        );
        setModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  return (
    <>
      <button
        className={active ? "warningBtn" : "goodBtn"}
        onClick={() => setModalOpen(true)}
        style={{ fontSize: "1.1rem", padding: "0.5rem 0.8rem" }}
      >
        {active ? "Deactivate" : "Reactivate"}
      </button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>
            {active ? "Deactivate" : "Reactivate"} passenger?
          </div>

          <p className='paragraph'>
            {active ? (
              <>
                You are about to deactivate <strong>{passengerName}</strong>.
                <br />
                <span className={styles.modalSubnote}>
                  They will no longer appear when booking rides for this
                  account. You can reactivate them at any time.
                </span>
              </>
            ) : (
              <>
                You are about to reactivate <strong>{passengerName}</strong>.
                <br />
                <span className={styles.modalSubnote}>
                  They will be available again when booking rides for this
                  account.
                </span>
              </>
            )}
          </p>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className={active ? "warningBtn" : "goodBtn"}
              onClick={handle}
              disabled={isPending}
            >
              {isPending
                ? active
                  ? "Deactivating..."
                  : "Reactivating..."
                : active
                  ? "Yes, Deactivate"
                  : "Yes, Reactivate"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
