// src/components/Invoice/InvoicePreview.tsx
"use client";

import styles from "./InvoicePreview.module.css";
import type { InvoiceData } from "@/lib/invoice/types";
import { formatMoney } from "@/lib/invoice/types";
import Logo from "@/components/shared/Logo/Logo";

type Props = {
  invoice: InvoiceData;
  onDownload: () => void;
  isDownloading?: boolean;
};

export default function InvoicePreview({
  invoice,
  onDownload,
  isDownloading,
}: Props) {
  const hasStops = invoice.trip.stops.length > 0;
  const hasRefund = invoice.amountRefundedCents > 0;
  const hasTip = invoice.tipCents > 0;
  const isCorporate = !!(
    invoice.paymentMethod ||
    invoice.paymentTerms ||
    invoice.poNumber
  );

  return (
    <div className={styles.container}>
      <div className={styles.invoice}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.logoSection}>
            <div className={styles.logoWrap}>
              {invoice.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invoice.logoUrl}
                  alt={invoice.company.name}
                  className={styles.logoImage}
                />
              ) : (
                <Logo className={styles.logo} />
              )}
              <span className={styles.logoText}>{invoice.company.name}</span>
            </div>
            <div className={styles.companyDetails}>
              {invoice.company.address && <p>{invoice.company.address}</p>}
              {invoice.company.city && <p>{invoice.company.city}</p>}
              {invoice.company.phone && <p>{invoice.company.phone}</p>}
              {invoice.company.email && <p>{invoice.company.email}</p>}
            </div>
          </div>

          <div className={styles.invoiceInfo}>
            <h1 className={styles.invoiceTitle}>INVOICE</h1>
            <div className={styles.invoiceMeta}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Invoice #</span>
                <span className={styles.metaValue}>
                  {invoice.invoiceNumber}
                </span>
              </div>
              {invoice.bookingConfirmation && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Booking</span>
                  <span className={styles.metaValue}>
                    #{invoice.bookingConfirmation}
                  </span>
                </div>
              )}
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Date</span>
                <span className={styles.metaValue}>{invoice.invoiceDate}</span>
              </div>
              {invoice.dueDate && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Due</span>
                  <span className={styles.metaValue}>{invoice.dueDate}</span>
                </div>
              )}
              {invoice.paidDate && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Paid</span>
                  <span className={styles.metaValue}>{invoice.paidDate}</span>
                </div>
              )}
              {invoice.invoiceStatus && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Status</span>
                  <span
                    className={`${styles.statusBadge} ${
                      invoice.invoiceStatus === "PAID"
                        ? styles.statusPaid
                        : invoice.invoiceStatus === "OVERDUE"
                          ? styles.statusOverdue
                          : styles.statusSent
                    }`}
                  >
                    {invoice.invoiceStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Bill To ── */}
        <section className={styles.billTo}>
          <h2 className={styles.sectionTitle}>Bill To</h2>
          <div className={styles.customerInfo}>
            <p className={styles.customerName}>{invoice.customer.name}</p>
            <p>{invoice.customer.email}</p>
            {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
          </div>
        </section>

        {/* ── Payment Method (how the ride was paid) ── */}
        {invoice.paymentMethodDisplay && (
          <section className={styles.paymentMethodSection}>
            <span className={styles.paymentMethodLabel}>Payment Method</span>
            <span className={styles.paymentMethodValue}>
              {invoice.paymentMethodDisplay}
            </span>
          </section>
        )}

        {/* ── Corporate billing info ── */}
        {isCorporate && (
          <section className={styles.paymentSection}>
            <h2 className={styles.sectionTitle}>Payment Information</h2>
            <div className={styles.paymentGrid}>
              {invoice.paymentMethod && (
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Payment Method</span>
                  <span className={styles.paymentValue}>
                    {invoice.paymentMethod}
                  </span>
                </div>
              )}
              {invoice.paymentTerms && (
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Payment Terms</span>
                  <span className={styles.paymentValue}>
                    {invoice.paymentTerms}
                  </span>
                </div>
              )}
              {invoice.poNumber && (
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>PO Number</span>
                  <span className={styles.paymentValue}>
                    {invoice.poNumber}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Trip Details ── */}
        <section className={styles.tripSection}>
          <h2 className={styles.sectionTitle}>Trip Details</h2>
          <div className={styles.tripGrid}>
            <div className={styles.tripRow}>
              <span className={styles.tripLabel}>Date & Time</span>
              <span className={styles.tripValue}>{invoice.trip.date}</span>
            </div>
            <div className={styles.tripRow}>
              <span className={styles.tripLabel}>Service</span>
              <span className={styles.tripValue}>
                {invoice.trip.serviceName}
              </span>
            </div>
            <div className={styles.tripRow}>
              <span className={styles.tripLabel}>Vehicle</span>
              <span className={styles.tripValue}>
                {invoice.trip.vehicleName}
              </span>
            </div>
            <div className={styles.tripRow}>
              <span className={styles.tripLabel}>Passengers / Luggage</span>
              <span className={styles.tripValue}>
                {invoice.trip.passengers} / {invoice.trip.luggage}
              </span>
            </div>
            {invoice.trip.distanceMiles && (
              <div className={styles.tripRow}>
                <span className={styles.tripLabel}>Distance</span>
                <span className={styles.tripValue}>
                  {invoice.trip.distanceMiles.toFixed(1)} miles
                </span>
              </div>
            )}
            {invoice.driverName && (
              <div className={styles.tripRow}>
                <span className={styles.tripLabel}>Driver</span>
                <span className={styles.tripValue}>{invoice.driverName}</span>
              </div>
            )}
          </div>
          <br />
          <br />
          {/* Route — per-leg for multi-trip, single route otherwise */}
          {invoice.legs && invoice.legs.length > 1 ? (
            invoice.legs.map((leg, legIdx) => (
              <div key={legIdx} className={styles.legBlock}>
                <p className={styles.legLabel}>
                  Trip {leg.legNumber} — {leg.date}
                </p>
                <div className={styles.route}>
                  <div className={styles.routePoint}>
                    <div className={styles.routeMarker} data-type='pickup'>
                      A
                    </div>
                    <div className={styles.routeAddress}>
                      <span className={styles.routeLabel}>Pickup</span>
                      <span>{leg.pickupAddress}</span>
                    </div>
                  </div>
                  <div className={styles.routePoint}>
                    <div className={styles.routeMarker} data-type='dropoff'>
                      B
                    </div>
                    <div className={styles.routeAddress}>
                      <span className={styles.routeLabel}>Dropoff</span>
                      <span>{leg.dropoffAddress}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.route}>
              <div className={styles.routePoint}>
                <div className={styles.routeMarker} data-type='pickup'>
                  A
                </div>
                <div className={styles.routeAddress}>
                  <span className={styles.routeLabel}>Pickup</span>
                  <span>{invoice.trip.pickupAddress}</span>
                </div>
              </div>

              {hasStops &&
                invoice.trip.stops.map((stop, index) => (
                  <div key={index} className={styles.routePoint}>
                    <div className={styles.routeMarker} data-type='stop'>
                      {index + 1}
                    </div>
                    <div className={styles.routeAddress}>
                      <span className={styles.routeLabel}>
                        Stop {index + 1}
                      </span>
                      <span>{stop.address}</span>
                    </div>
                  </div>
                ))}

              <div className={styles.routePoint}>
                <div className={styles.routeMarker} data-type='dropoff'>
                  B
                </div>
                <div className={styles.routeAddress}>
                  <span className={styles.routeLabel}>Dropoff</span>
                  <span>{invoice.trip.dropoffAddress}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Line Items ── */}
        <section className={styles.lineItemsSection}>
          <table className={styles.lineItemsTable}>
            <thead>
              <tr>
                <th className={styles.lineItemDesc}>Description</th>
                <th className={styles.lineItemAmount}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr key={index}>
                  <td className={styles.lineItemDesc}>{item.description}</td>
                  <td className={styles.lineItemAmount}>
                    {formatMoney(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Totals ── */}
        <section className={styles.totalsSection}>
          <div className={styles.totalsGrid}>
            <div className={styles.totalsRow}>
              <span>Subtotal</span>
              <span>
                {formatMoney(invoice.subtotalCents, invoice.currency)}
              </span>
            </div>
            {invoice.feesCents > 0 && (
              <div className={styles.totalsRow}>
                <span>Fees</span>
                <span>{formatMoney(invoice.feesCents, invoice.currency)}</span>
              </div>
            )}
            {invoice.taxesCents > 0 && (
              <div className={styles.totalsRow}>
                <span>Tax</span>
                <span>{formatMoney(invoice.taxesCents, invoice.currency)}</span>
              </div>
            )}
            <div className={`${styles.totalsRow} ${styles.totalsBold}`}>
              <span>Total</span>
              <span>{formatMoney(invoice.totalCents, invoice.currency)}</span>
            </div>
            {hasTip && (
              <div className={`${styles.totalsRow} ${styles.tipRow}`}>
                <span>Driver Tip</span>
                <span>{formatMoney(invoice.tipCents, invoice.currency)}</span>
              </div>
            )}
            <div className={styles.divider} />
            <div className={`${styles.totalsRow} ${styles.amountPaid}`}>
              <span>Amount Paid</span>
              <span>{formatMoney(invoice.amountPaidCents, invoice.currency)}</span>
            </div>
            {invoice.depositMode && invoice.depositCents && (invoice.balanceCents ?? 0) > 0 && (
              <>
                <div className={styles.divider} />
                <div className={styles.totalsRow} style={{ color: "#b45309", fontWeight: 700 }}>
                  <span>Deposit Paid ({invoice.depositPercent}%)</span>
                  <span>{formatMoney(invoice.depositCents, invoice.currency)}</span>
                </div>
                <div className={styles.totalsRow} style={{ color: "#92400e" }}>
                  <span>
                    Balance Due
                    {invoice.balanceDueDate ? ` · by ${invoice.balanceDueDate}` : ""}
                  </span>
                  <span>{formatMoney(invoice.balanceCents, invoice.currency)}</span>
                </div>
              </>
            )}
            {hasRefund && (
              <div className={`${styles.totalsRow} ${styles.refund}`}>
                <span>Refunded</span>
                <span>
                  -{formatMoney(invoice.amountRefundedCents, invoice.currency)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Paid Stamp ── */}
        {(invoice.paidDate || invoice.invoiceStatus === "PAID") && (
          <div className={styles.paidStamp}>
            <span className={styles.paidText}>PAID</span>
            {invoice.paidDate && (
              <span className={styles.paidDate}>{invoice.paidDate}</span>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <p>Thank you for choosing {invoice.company.name}!</p>
          <p className={styles.footerSmall}>
            Questions? Contact us at{" "}
            {invoice.company.email || invoice.company.phone}
          </p>
        </footer>
      </div>

      {/* ── Download Button ── */}
      <div className={styles.actions}>
        <button
          type='button'
          className={styles.downloadBtn}
          onClick={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <span className={styles.spinner} />
              Generating PDF...
            </>
          ) : (
            <>
              <span className={styles.downloadIcon}>📥</span>
              Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
