"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateAccountDetailPage.module.css";
import Modal from "@/components/shared/Modal/Modal";
import {
  updateAccountStatus,
  addCorporatePassenger,
  togglePassengerActive,
} from "../../../../../actions/corporate/corporateAdminActions";

/* ─────────────────────────────────────────────
   Account Status Actions
   ───────────────────────────────────────────── */

export function AccountStatusClient({
  accountId,
  currentStatus,
}: {
  accountId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: "ACTIVE" | "SUSPENDED" | "CLOSED") {
    const labels: Record<string, string> = {
      ACTIVE: "reactivate",
      SUSPENDED: "suspend",
      CLOSED: "close",
    };
    if (
      !window.confirm(
        `Are you sure you want to ${labels[newStatus]} this account?`,
      )
    )
      return;

    startTransition(async () => {
      const res = await updateAccountStatus(accountId, newStatus);
      if (res.ok) {
        toast.success(`Account ${labels[newStatus]}d.`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  return (
    <div className={`${styles.card} ${styles.dangerCard}`}>
      <div className={styles.dangerTop}>
        <div className='cardTitle h4'>Account Status</div>
        <p className='subheading'>
          Manage the status of this corporate account.
        </p>
      </div>
      <div className={styles.actionsRow}>
        {currentStatus !== "ACTIVE" && (
          <button
            className='goodBtn'
            onClick={() => handleStatusChange("ACTIVE")}
            disabled={isPending}
          >
            Reactivate
          </button>
        )}
        {currentStatus !== "SUSPENDED" && currentStatus !== "CLOSED" && (
          <button
            className='warningBtn'
            onClick={() => handleStatusChange("SUSPENDED")}
            disabled={isPending}
          >
            Suspend
          </button>
        )}
        {currentStatus !== "CLOSED" && (
          <button
            className='dangerBtn'
            onClick={() => handleStatusChange("CLOSED")}
            disabled={isPending}
          >
            Close Account
          </button>
        )}
      </div>
    </div>
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
      <button className='neutralBtn' onClick={() => setModalOpen(true)}>
        + Add Passenger
      </button>

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          {" "}
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
  active,
}: {
  passengerId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const res = await togglePassengerActive(passengerId, !active);
      if (res.ok) {
        toast.success(
          active ? "Passenger deactivated." : "Passenger reactivated.",
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  return (
    <button
      className={active ? "warningBtn" : "goodBtn"}
      onClick={handle}
      disabled={isPending}
      style={{ fontSize: "1.1rem", padding: "0.5rem 0.8rem" }}
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
