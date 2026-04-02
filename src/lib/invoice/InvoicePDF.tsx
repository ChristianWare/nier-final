/* eslint-disable @typescript-eslint/no-unused-vars */
// src/lib/invoice/InvoicePDF.tsx
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import type { InvoiceData } from "./types";
import { formatMoney } from "./types";
import { pdfStyles as s } from "./InvoicePDF.styles";

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? s.statusPaid
      : status === "OVERDUE"
        ? s.statusOverdue
        : s.statusSent;
  return <Text style={[s.statusBadge, tone]}>{status}</Text>;
}

export default function InvoicePDF({ invoice }: { invoice: InvoiceData }) {
  const hasStops = invoice.trip.stops.length > 0;
  const hasRefund = invoice.amountRefundedCents > 0;
  const hasTip = invoice.tipCents > 0;
  const showPaidStamp = !!(
    invoice.paidDate || invoice.invoiceStatus === "PAID"
  );
  const isCorporate = !!(
    invoice.paymentMethod ||
    invoice.paymentTerms ||
    invoice.poNumber
  );

  return (
    <Document>
      <Page size='A4' style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          {/* Logo + company info */}
          <View style={s.logoSection}>
            {invoice.logoUrl ? (
              <View style={s.logoImageWrap}>
                {/* <Image src={invoice.logoUrl} style={s.logoImage} /> */}
              </View>
            ) : (
              <View style={s.logoFallbackRow}>
                {/* <View style={s.logoBox}>
                  <Text style={s.logoBoxLetter}>N</Text>
                </View> */}
                <Text style={s.companyName}>{invoice.company.name}</Text>
              </View>
            )}
            {/* Show name below image if logoUrl is set */}
            {invoice.logoUrl && (
              <Text style={s.companyName}>{invoice.company.name}</Text>
            )}
            <View style={{ marginTop: 6 }}>
              {invoice.company.address ? (
                <Text style={s.companyDetails}>{invoice.company.address}</Text>
              ) : null}
              {invoice.company.city ? (
                <Text style={s.companyDetails}>{invoice.company.city}</Text>
              ) : null}
              {invoice.company.phone ? (
                <Text style={s.companyDetails}>{invoice.company.phone}</Text>
              ) : null}
              {invoice.company.email ? (
                <Text style={s.companyDetails}>{invoice.company.email}</Text>
              ) : null}
            </View>
          </View>

          {/* Invoice meta */}
          <View style={s.invoiceInfoCol}>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice #</Text>
              <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            {invoice.bookingConfirmation ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Booking</Text>
                <Text style={s.metaValue}>#{invoice.bookingConfirmation}</Text>
              </View>
            ) : null}
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{invoice.invoiceDate}</Text>
            </View>
            {invoice.dueDate ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Due</Text>
                <Text style={s.metaValue}>{invoice.dueDate}</Text>
              </View>
            ) : null}
            {invoice.paidDate ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Paid</Text>
                <Text style={s.metaValue}>{invoice.paidDate}</Text>
              </View>
            ) : null}
            {invoice.invoiceStatus ? (
              <View style={[s.metaRow, { marginTop: 4 }]}>
                <Text style={s.metaLabel}>{""}</Text>
                <View style={s.metaBadgeWrap}>
                  <StatusBadge status={invoice.invoiceStatus} />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Bill To ── */}
        <View style={s.billToSection}>
          <Text style={s.sectionLabel}>BILL TO</Text>
          <Text style={s.customerName}>{invoice.customer.name}</Text>
          {invoice.customer.email ? (
            <Text style={s.customerDetail}>{invoice.customer.email}</Text>
          ) : null}
          {invoice.customer.phone ? (
            <Text style={s.customerDetail}>{invoice.customer.phone}</Text>
          ) : null}
        </View>

        {/* ── Payment Method (how ride was paid) ── */}
        {invoice.paymentMethodDisplay ? (
          <View style={s.paymentMethodSection}>
            <Text style={s.paymentMethodLabel}>PAYMENT METHOD</Text>
            <Text style={s.paymentMethodValue}>
              {invoice.paymentMethodDisplay}
            </Text>
          </View>
        ) : null}

        {/* ── Corporate billing info ── */}
        {isCorporate ? (
          <View style={s.corporatePaymentSection}>
            <Text style={s.sectionLabel}>PAYMENT INFORMATION</Text>
            <View style={s.corporatePaymentGrid}>
              {invoice.paymentMethod ? (
                <View style={s.corporatePaymentItem}>
                  <Text style={s.corporatePaymentItemLabel}>
                    PAYMENT METHOD
                  </Text>
                  <Text style={s.corporatePaymentItemValue}>
                    {invoice.paymentMethod}
                  </Text>
                </View>
              ) : null}
              {invoice.paymentTerms ? (
                <View style={s.corporatePaymentItem}>
                  <Text style={s.corporatePaymentItemLabel}>PAYMENT TERMS</Text>
                  <Text style={s.corporatePaymentItemValue}>
                    {invoice.paymentTerms}
                  </Text>
                </View>
              ) : null}
              {invoice.poNumber ? (
                <View style={s.corporatePaymentItem}>
                  <Text style={s.corporatePaymentItemLabel}>PO NUMBER</Text>
                  <Text style={s.corporatePaymentItemValue}>
                    {invoice.poNumber}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Trip details ── */}
        <View style={s.tripSection}>
          <Text style={s.sectionLabel}>TRIP DETAILS</Text>
          <View style={s.tripGrid}>
            <View style={s.tripItem}>
              <Text style={s.tripItemLabel}>DATE & TIME</Text>
              <Text style={s.tripItemValue}>{invoice.trip.date}</Text>
            </View>
            <View style={s.tripItem}>
              <Text style={s.tripItemLabel}>SERVICE</Text>
              <Text style={s.tripItemValue}>{invoice.trip.serviceName}</Text>
            </View>
            <View style={s.tripItem}>
              <Text style={s.tripItemLabel}>VEHICLE</Text>
              <Text style={s.tripItemValue}>{invoice.trip.vehicleName}</Text>
            </View>
            <View style={s.tripItem}>
              <Text style={s.tripItemLabel}>PASSENGERS / LUGGAGE</Text>
              <Text style={s.tripItemValue}>
                {invoice.trip.passengers} / {invoice.trip.luggage}
              </Text>
            </View>
            {invoice.trip.distanceMiles ? (
              <View style={s.tripItem}>
                <Text style={s.tripItemLabel}>DISTANCE</Text>
                <Text style={s.tripItemValue}>
                  {invoice.trip.distanceMiles.toFixed(1)} miles
                </Text>
              </View>
            ) : null}
            {invoice.driverName ? (
              <View style={s.tripItem}>
                <Text style={s.tripItemLabel}>DRIVER</Text>
                <Text style={s.tripItemValue}>{invoice.driverName}</Text>
              </View>
            ) : null}
          </View>

          {/* Route — per-leg for multi-trip, single route otherwise */}
          {invoice.legs && invoice.legs.length > 1 ? (
            invoice.legs.map((leg, legIdx) => (
              <View key={legIdx} style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: "Helvetica-Bold",
                    color: "#1e40af",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Trip {leg.legNumber} — {leg.date}
                </Text>
                <View style={s.route}>
                  <View style={s.routePoint}>
                    <View style={[s.routeMarker, s.routeMarkerPickup]}>
                      <Text style={s.routeMarkerText}>A</Text>
                    </View>
                    <View style={s.routeContent}>
                      <Text style={s.routePointLabel}>PICKUP</Text>
                      <Text style={s.routePointAddress}>
                        {leg.pickupAddress}
                      </Text>
                    </View>
                  </View>
                  <View style={s.routePoint}>
                    <View style={[s.routeMarker, s.routeMarkerDropoff]}>
                      <Text style={s.routeMarkerText}>B</Text>
                    </View>
                    <View style={s.routeContent}>
                      <Text style={s.routePointLabel}>DROPOFF</Text>
                      <Text style={s.routePointAddress}>
                        {leg.dropoffAddress}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={s.route}>
              <View style={s.routePoint}>
                <View style={[s.routeMarker, s.routeMarkerPickup]}>
                  <Text style={s.routeMarkerText}>A</Text>
                </View>
                <View style={s.routeContent}>
                  <Text style={s.routePointLabel}>PICKUP</Text>
                  <Text style={s.routePointAddress}>
                    {invoice.trip.pickupAddress}
                  </Text>
                </View>
              </View>

              {hasStops &&
                invoice.trip.stops.map((stop, i) => (
                  <View key={i} style={s.routePoint}>
                    <View style={[s.routeMarker, s.routeMarkerStop]}>
                      <Text style={s.routeMarkerText}>{i + 1}</Text>
                    </View>
                    <View style={s.routeContent}>
                      <Text style={s.routePointLabel}>STOP {i + 1}</Text>
                      <Text style={s.routePointAddress}>{stop.address}</Text>
                    </View>
                  </View>
                ))}

              <View style={s.routePoint}>
                <View style={[s.routeMarker, s.routeMarkerDropoff]}>
                  <Text style={s.routeMarkerText}>B</Text>
                </View>
                <View style={s.routeContent}>
                  <Text style={s.routePointLabel}>DROPOFF</Text>
                  <Text style={s.routePointAddress}>
                    {invoice.trip.dropoffAddress}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Multi-leg trip summary ── */}
        {invoice.legs && invoice.legs.length > 0 ? (
          <View style={s.tripSection}>
            <Text style={s.sectionLabel}>TRIP ITINERARY</Text>
            {invoice.legs.map((leg) => (
              <View key={leg.legNumber} style={s.tripItem}>
                <Text style={s.tripItemLabel}>
                  RIDE {leg.legNumber} — {leg.date}
                </Text>
                <Text style={s.tripItemValue}>
                  {leg.pickupAddress} → {leg.dropoffAddress}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Line items ── */}
        <View style={s.lineItemsSection}>
          <View style={s.lineItemsHeader}>
            <Text style={s.lineItemsHeaderDesc}>DESCRIPTION</Text>
            <Text style={s.lineItemsHeaderAmount}>AMOUNT</Text>
          </View>
          {invoice.lineItems.map((item, i) => (
            <View key={i} style={s.lineItemRow}>
              <Text style={s.lineItemDesc}>{item.description}</Text>
              <Text style={s.lineItemAmount}>
                {formatMoney(item.amount, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsGrid}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>
                {formatMoney(invoice.subtotalCents, invoice.currency)}
              </Text>
            </View>
            {invoice.feesCents > 0 ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Fees</Text>
                <Text style={s.totalsValue}>
                  {formatMoney(invoice.feesCents, invoice.currency)}
                </Text>
              </View>
            ) : null}
            {invoice.taxesCents > 0 ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Tax</Text>
                <Text style={s.totalsValue}>
                  {formatMoney(invoice.taxesCents, invoice.currency)}
                </Text>
              </View>
            ) : null}
            <View style={s.totalsBoldRow}>
              <Text style={s.totalsBoldLabel}>Total</Text>
              <Text style={s.totalsBoldValue}>
                {formatMoney(invoice.totalCents, invoice.currency)}
              </Text>
            </View>
            {hasTip ? (
              <View style={s.totalsRow}>
                <Text style={s.tipLabel}>Driver Tip</Text>
                <Text style={s.tipValue}>
                  {formatMoney(invoice.tipCents, invoice.currency)}
                </Text>
              </View>
            ) : null}
            <View style={s.divider} />
            <View style={s.amountPaidRow}>
              <Text style={s.amountPaidLabel}>Amount Paid</Text>
              <Text style={s.amountPaidValue}>
                {formatMoney(invoice.amountPaidCents, invoice.currency)}
              </Text>
            </View>
            {/* Deposit breakdown */}
            {invoice.depositMode &&
              invoice.depositCents &&
              (invoice.balanceCents ?? 0) > 0 && (
                <>
                  <View style={s.divider} />
                  <View style={s.totalsRow}>
                    <Text
                      style={{
                        fontSize: 9,
                        color: "#f59e0b",
                        fontFamily: "Helvetica-Bold",
                      }}
                    >
                      DEPOSIT PAID ({invoice.depositPercent ?? ""}%)
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        color: "#f59e0b",
                        fontFamily: "Helvetica-Bold",
                        textAlign: "right",
                      }}
                    >
                      {formatMoney(invoice.depositCents, invoice.currency)}
                      {invoice.depositDueDate ? `` : ""}
                    </Text>
                  </View>
                  <View style={s.totalsRow}>
                    <Text style={{ fontSize: 9, color: "#92400e" }}>
                      Balance Due
                      {invoice.balanceDueDate
                        ? ` (by ${invoice.balanceDueDate})`
                        : ""}
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        color: "#92400e",
                        textAlign: "right",
                      }}
                    >
                      {formatMoney(invoice.balanceCents, invoice.currency)}
                    </Text>
                  </View>
                </>
              )}
            {hasRefund ? (
              <View style={s.totalsRow}>
                <Text style={s.refundLabel}>Refunded</Text>
                <Text style={s.refundValue}>
                  -{formatMoney(invoice.amountRefundedCents, invoice.currency)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Paid stamp ── */}
        {showPaidStamp ? (
          <View style={s.paidStampContainer}>
            <View style={s.paidStamp}>
              <Text style={s.paidStampText}>PAID</Text>
              {invoice.paidDate ? (
                <Text style={s.paidStampDate}>{invoice.paidDate}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Thank you for choosing {invoice.company.name}!
          </Text>
          <Text style={s.footerSmall}>
            Questions? Contact us at{" "}
            {invoice.company.email || invoice.company.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
