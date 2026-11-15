"use client";

// Manage roles → Corporate: link a user to one or more corporate accounts,
// which lets them use the corporate portal (/corporate) for that company.
// Linking adds the CORPORATE role and puts them on the account's contacts
// and passenger list; removing the last account takes the role away. The
// account's primary contact can't be removed here.

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  linkUserToCorporateAccount,
  unlinkUserFromCorporateAccount,
} from "../../../../actions/admin/users";
import styles from "./CorporateAccessForm.module.css";

export type CorporateLink = {
  accountId: string;
  name: string;
  /** "PRIMARY" receives the invoices; "ADMIN" books and manages rides. */
  role: "PRIMARY" | "ADMIN";
};

type Props = {
  userId: string;
  links: CorporateLink[];
  /** Every active corporate account, to link to. */
  accounts: { id: string; name: string }[];
};

export default function CorporateAccessForm({
  userId,
  links,
  accounts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const linkedIds = new Set(links.map((l) => l.accountId));
  const options = accounts.filter((a) => !linkedIds.has(a.id));
  const [choice, setChoice] = useState("");

  const link = () => {
    if (!choice) return;
    startTransition(async () => {
      const res = await linkUserToCorporateAccount(userId, choice);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Linked to ${res.accountName}.`);
      setChoice("");
      router.refresh();
    });
  };

  const unlink = (l: CorporateLink) => {
    startTransition(async () => {
      const res = await unlinkUserFromCorporateAccount(userId, l.accountId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Removed from ${l.name}.`);
      router.refresh();
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <span className={styles.label}>CORPORATE</span>
        <span className={styles.desc}>
          Can book and manage rides for a company in the corporate portal.
        </span>
      </div>

      {links.length > 0 ? (
        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.accountId} className={styles.link}>
              <Link
                href={`/admin/corporate/${l.accountId}`}
                className={styles.linkName}
              >
                {l.name}
              </Link>
              <span className={styles.linkRole}>
                {l.role === "PRIMARY" ? "Primary contact" : "Booker"}
              </span>
              {l.role !== "PRIMARY" ? (
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() => unlink(l)}
                  disabled={pending}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {accounts.length === 0 ? (
        <p className={styles.note}>
          No corporate accounts yet.{" "}
          <Link href='/admin/corporate' className={styles.inlineLink}>
            Add one
          </Link>{" "}
          first.
        </p>
      ) : options.length > 0 ? (
        <div className={styles.add}>
          <select
            className='select'
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={pending}
            aria-label='Corporate account to link'
          >
            <option value=''>
              {links.length > 0 ? "Add another account…" : "Choose an account…"}
            </option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type='button'
            className='primaryBtn'
            onClick={link}
            disabled={!choice || pending}
          >
            {pending ? "Saving…" : "Link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
