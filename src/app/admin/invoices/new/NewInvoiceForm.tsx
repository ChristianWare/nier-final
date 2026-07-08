"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NewInvoiceForm.module.css";
import Button from "@/components/shared/Button/Button";
import { adminCreateInvoice } from "../../../../../actions/admin/invoices/adminCreateInvoice";
import { adminSearchUsers } from "../../../../../actions/admin/users/adminSearchUsers";

type UserLite = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  phone: string | null;
};

type LineItem = {
  key: string;
  description: string;
  quantity: string; // kept as string for input control
  unitPrice: string; // dollars, as typed
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function dollarsToCents(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

const emptyLine = (): LineItem => ({
  key: uid(),
  description: "",
  quantity: "1",
  unitPrice: "",
});

export default function NewInvoiceForm() {
  const router = useRouter();

  const [customerKind, setCustomerKind] = useState<"account" | "guest">(
    "account",
  );

  // Account search
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserLite[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserLite | null>(null);

  // Guest
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);

  // Options
  const [memo, setMemo] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [allowTip, setAllowTip] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAbort = useRef(true);

  // Debounced user search
  useEffect(() => {
    if (customerKind !== "account") return;
    if (selectedUser) return;

    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      setUserSearching(false);
      return;
    }

    searchAbort.current = true;
    setUserSearching(true);

    const t = setTimeout(async () => {
      try {
        const res = await adminSearchUsers({ query: q });
        if (!searchAbort.current) return;
        setUserResults((res?.users ?? []) as UserLite[]);
      } catch {
        if (!searchAbort.current) return;
        setUserResults([]);
      } finally {
        if (searchAbort.current) setUserSearching(false);
      }
    }, 250);

    return () => {
      searchAbort.current = false;
      clearTimeout(t);
    };
  }, [customerKind, userQuery, selectedUser]);

  function selectUser(u: UserLite) {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery("");
  }

  function clearUser() {
    setSelectedUser(null);
  }

  function updateLine(key: string, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li) => (li.key === key ? { ...li, ...patch } : li)),
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLineItems((prev) =>
      prev.length === 1 ? prev : prev.filter((li) => li.key !== key),
    );
  }

  const subtotalCents = lineItems.reduce((sum, li) => {
    const qty = Math.max(1, Math.floor(Number(li.quantity) || 0));
    return sum + qty * dollarsToCents(li.unitPrice);
  }, 0);

  async function handleSubmit() {
    setError(null);

    // Client-side guardrails (server re-validates)
    if (customerKind === "account" && !selectedUser) {
      setError("Select an account holder, or switch to Guest.");
      return;
    }
    if (customerKind === "guest" && !guestEmail.trim()) {
      setError("Enter a guest email.");
      return;
    }
    const hasItem = lineItems.some(
      (li) => li.description.trim().length > 0 && dollarsToCents(li.unitPrice) > 0,
    );
    if (!hasItem || subtotalCents <= 0) {
      setError("Add at least one line item with a description and amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminCreateInvoice({
        customerKind,
        userId: customerKind === "account" ? selectedUser?.id : null,
        guestName: customerKind === "guest" ? guestName : null,
        guestEmail: customerKind === "guest" ? guestEmail : null,
        guestPhone: customerKind === "guest" ? guestPhone : null,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: Math.max(1, Math.floor(Number(li.quantity) || 0)),
          unitAmountCents: dollarsToCents(li.unitPrice),
        })),
        memo,
        internalNotes,
        dueDate: dueDate || null,
        allowTip,
      });

      if ("error" in res) {
        setError(res.error);
        setSubmitting(false);
        return;
      }

      router.push(`/admin/invoices/${res.invoiceId}`);
    } catch {
      setError("Something went wrong creating the invoice. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      {/* ── Customer ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Customer</h2>

        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${customerKind === "account" ? styles.toggleActive : ""}`}
            onClick={() => setCustomerKind("account")}
          >
            Account holder
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${customerKind === "guest" ? styles.toggleActive : ""}`}
            onClick={() => setCustomerKind("guest")}
          >
            Guest (email only)
          </button>
        </div>

        {customerKind === "account" ? (
          <div className={styles.field}>
            {selectedUser ? (
              <div className={styles.selectedUser}>
                <div>
                  <div className={styles.selectedName}>
                    {(selectedUser.name ?? "").trim() || "Unnamed user"}
                  </div>
                  <div className={styles.selectedEmail}>
                    {selectedUser.email}
                    {selectedUser.phone ? ` · ${selectedUser.phone}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={clearUser}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className={styles.searchWrap}>
                <label className={styles.label}>Search by name or email</label>
                <input
                  className={styles.input}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Start typing a customer's name or email…"
                  autoComplete="off"
                />
                {userSearching && (
                  <div className={styles.searchHint}>Searching…</div>
                )}
                {userResults.length > 0 && (
                  <ul className={styles.results}>
                    {userResults.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          className={styles.resultBtn}
                          onClick={() => selectUser(u)}
                        >
                          <span className={styles.resultName}>
                            {(u.name ?? "").trim() || "Unnamed user"}
                          </span>
                          <span className={styles.resultEmail}>{u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {userQuery.trim().length >= 2 &&
                  !userSearching &&
                  userResults.length === 0 && (
                    <div className={styles.searchHint}>
                      No matches. They may not have an account — switch to Guest.
                    </div>
                  )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.guestGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Name (optional)</label>
              <input
                className={styles.input}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email (required)</label>
              <input
                className={styles.input}
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone (optional)</label>
              <input
                className={styles.input}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="(602) 555-0142"
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Line items ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Line items</h2>

        <div className={styles.lineHead}>
          <span>Description</span>
          <span className={styles.qtyCol}>Qty</span>
          <span className={styles.priceCol}>Unit price</span>
          <span className={styles.totalCol}>Total</span>
          <span className={styles.removeCol} aria-hidden />
        </div>

        {lineItems.map((li) => {
          const qty = Math.max(1, Math.floor(Number(li.quantity) || 0));
          const lineTotal = qty * dollarsToCents(li.unitPrice);
          return (
            <div key={li.key} className={styles.lineRow}>
              <input
                className={styles.input}
                value={li.description}
                onChange={(e) =>
                  updateLine(li.key, { description: e.target.value })
                }
                placeholder="e.g. Cleaning fee, wait time, damage…"
              />
              <input
                className={`${styles.input} ${styles.qtyCol}`}
                type="number"
                min={1}
                step={1}
                value={li.quantity}
                onChange={(e) =>
                  updateLine(li.key, { quantity: e.target.value })
                }
              />
              <div className={`${styles.priceCol} ${styles.priceInputWrap}`}>
                <span className={styles.dollar}>$</span>
                <input
                  className={`${styles.input} ${styles.priceInput}`}
                  inputMode="decimal"
                  value={li.unitPrice}
                  onChange={(e) =>
                    updateLine(li.key, { unitPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <span className={styles.totalCol}>{fmt(lineTotal)}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeLine(li.key)}
                disabled={lineItems.length === 1}
                aria-label="Remove line item"
              >
                ×
              </button>
            </div>
          );
        })}

        <button type="button" className={styles.addBtn} onClick={addLine}>
          + Add line item
        </button>

        <div className={styles.subtotalRow}>
          <span>Subtotal</span>
          <span className={styles.subtotalAmount}>{fmt(subtotalCents)}</span>
        </div>
        <p className={styles.tipNote}>
          {allowTip
            ? "The customer can add an optional tip at checkout."
            : "Tipping is turned off — the customer pays exactly this amount."}
        </p>
      </section>

      {/* ── Details ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Details</h2>

        <div className={styles.field}>
          <label className={styles.label}>
            Memo to customer (optional)
          </label>
          <textarea
            className={styles.textarea}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Shown on the invoice and receipt, e.g. “Thanks for your business.”"
            rows={2}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Internal notes (admin only, optional)
          </label>
          <textarea
            className={styles.textarea}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Not visible to the customer."
            rows={2}
          />
        </div>

        <div className={styles.optionsGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Due date (optional)</label>
            <input
              className={styles.input}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={allowTip}
              onChange={(e) => setAllowTip(e.target.checked)}
            />
            <span>Allow the customer to add a tip at checkout</span>
          </label>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <Button href="/admin/invoices" btnType="grayReg" text="Cancel" />
        <Button
          btnType="greenReg"
          text={submitting ? "Creating…" : "Create invoice"}
          onClick={handleSubmit}
          disabled={submitting}
          as="button"
          // checkIcon
        />
      </div>
    </div>
  );
}