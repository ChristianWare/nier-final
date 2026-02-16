/* eslint-disable jsx-a11y/alt-text */
// src/lib/invoice/InvoicePDF.tsx
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { InvoiceData } from "./types";
import { formatMoney } from "./types";

// Use Helvetica (built-in) - more reliable than custom fonts
const FONT_FAMILY = "Helvetica";

// Simple text-based logo instead of SVG
function NierLogoText() {
  return (
    <View style={logoStyles.container}>
      <Text style={logoStyles.letter}>N</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    backgroundColor: "#000000",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  letter: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: 700,
  },
  logoImage: {
    maxWidth: 120,
    maxHeight: 40,
    objectFit: "contain",
    marginBottom: 4,
  },
});

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#f0f0f0",
  },
  logoSection: {
    flexDirection: "column",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
  },
  companyDetails: {
    fontSize: 9,
    color: "#666666",
  },
  invoiceInfo: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: "#888888",
    width: 60,
    textAlign: "right",
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 700,
    width: 90,
    textAlign: "right",
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusSent: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  statusOverdue: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },

  // Bill To
  billTo: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#888888",
    marginBottom: 8,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  customerInfo: {
    fontSize: 10,
    color: "#333333",
  },

  // Payment Info Section
  paymentSection: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paymentItem: {
    width: "33%",
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 7,
    color: "#888888",
    fontWeight: 700,
    marginBottom: 2,
  },
  paymentValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#222222",
  },

  // Trip Section
  tripSection: {
    backgroundColor: "#fafafa",
    padding: 16,
    marginBottom: 24,
  },
  tripGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tripItem: {
    width: "50%",
    marginBottom: 10,
  },
  tripLabel: {
    fontSize: 8,
    color: "#888888",
    marginBottom: 2,
  },
  tripValue: {
    fontSize: 10,
    fontWeight: 700,
  },

  // Route
  route: {
    marginTop: 8,
  },
  routePoint: {
    flexDirection: "row",
    marginBottom: 10,
  },
  routeMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  routeMarkerText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
  },
  routeMarkerPickup: {
    backgroundColor: "#22c55e",
  },
  routeMarkerStop: {
    backgroundColor: "#3b82f6",
  },
  routeMarkerDropoff: {
    backgroundColor: "#ef4444",
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 7,
    color: "#888888",
    fontWeight: 700,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 9,
  },

  // Line Items
  lineItemsSection: {
    marginBottom: 24,
  },
  lineItemsHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#eeeeee",
    paddingBottom: 8,
    marginBottom: 8,
  },
  lineItemsHeaderText: {
    fontSize: 8,
    color: "#888888",
    fontWeight: 700,
  },
  lineItemRow: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  lineItemDesc: {
    flex: 1,
    fontSize: 10,
  },
  lineItemAmount: {
    width: 80,
    textAlign: "right",
    fontSize: 10,
  },

  // Totals
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  totalsGrid: {
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 4,
  },
  totalsLabel: {
    fontSize: 10,
  },
  totalsValue: {
    fontSize: 10,
    textAlign: "right",
  },
  totalsBold: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
  },
  totalsBoldText: {
    fontWeight: 700,
    fontSize: 11,
  },
  amountPaid: {
    paddingTop: 8,
    marginTop: 4,
  },
  amountPaidText: {
    fontWeight: 700,
    fontSize: 12,
    color: "#22c55e",
  },
  refundText: {
    color: "#ef4444",
  },
  divider: {
    height: 1,
    backgroundColor: "#eeeeee",
    marginTop: 4,
    marginBottom: 4,
  },

  // Paid Stamp
  paidStampContainer: {
    position: "absolute",
    top: 350,
    left: 180,
  },
  paidStamp: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    borderWidth: 3,
    borderColor: "#86efac",
    borderRadius: 6,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
  },
  paidText: {
    fontSize: 36,
    fontWeight: 700,
    color: "#86efac",
  },
  paidDate: {
    fontSize: 10,
    fontWeight: 700,
    color: "#4ade80",
    marginTop: 2,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerText: {
    fontSize: 10,
    color: "#333333",
    fontWeight: 700,
    marginBottom: 4,
  },
  footerSmall: {
    fontSize: 9,
    color: "#666666",
  },
});

function StatusBadge({ status }: { status: string }) {
  const badgeStyle =
    status === "PAID"
      ? styles.statusPaid
      : status === "OVERDUE"
        ? styles.statusOverdue
        : styles.statusSent;

  return <Text style={[styles.statusBadge, badgeStyle]}>{status}</Text>;
}

export default function InvoicePDF({ invoice }: { invoice: InvoiceData }) {
  const hasStops = invoice.trip.stops.length > 0;
  const hasRefund = invoice.amountRefundedCents > 0;
  const hasTip = invoice.tipCents > 0;
  const isCorporate = !!(
    invoice.paymentMethod ||
    invoice.paymentTerms ||
    invoice.poNumber
  );
  const showPaidStamp = !!(
    invoice.paidDate || invoice.invoiceStatus === "PAID"
  );

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {invoice.logoUrl ? (
              <View style={{ marginBottom: 8 }}>
                <Image src={invoice.logoUrl} style={logoStyles.logoImage} />
              </View>
            ) : (
              <View style={styles.logoRow}>
                <NierLogoText />
                <Text style={styles.companyName}>{invoice.company.name}</Text>
              </View>
            )}
            {invoice.logoUrl && (
              <Text style={styles.companyName}>{invoice.company.name}</Text>
            )}
            <View style={styles.companyDetails}>
              {invoice.company.address && (
                <Text>{invoice.company.address}</Text>
              )}
              {invoice.company.city && <Text>{invoice.company.city}</Text>}
              {invoice.company.phone && <Text>{invoice.company.phone}</Text>}
              {invoice.company.email && <Text>{invoice.company.email}</Text>}
            </View>
          </View>

          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice #</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            {invoice.bookingConfirmation && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Booking</Text>
                <Text style={styles.metaValue}>
                  #{invoice.bookingConfirmation}
                </Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{invoice.invoiceDate}</Text>
            </View>
            {invoice.dueDate && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due</Text>
                <Text style={styles.metaValue}>{invoice.dueDate}</Text>
              </View>
            )}
            {invoice.paidDate && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Paid</Text>
                <Text style={styles.metaValue}>{invoice.paidDate}</Text>
              </View>
            )}
            {invoice.invoiceStatus && (
              <View style={[styles.metaRow, { marginTop: 4 }]}>
                <Text style={styles.metaLabel}></Text>
                <View style={{ width: 90, alignItems: "flex-end" }}>
                  <StatusBadge status={invoice.invoiceStatus} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.sectionTitle}>BILL TO</Text>
          <Text style={styles.customerName}>{invoice.customer.name}</Text>
          <Text style={styles.customerInfo}>{invoice.customer.email}</Text>
          {invoice.customer.phone && (
            <Text style={styles.customerInfo}>{invoice.customer.phone}</Text>
          )}
        </View>

        {/* Payment Info (corporate only) */}
        {isCorporate && (
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>PAYMENT INFORMATION</Text>
            <View style={styles.paymentGrid}>
              {invoice.paymentMethod && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>PAYMENT METHOD</Text>
                  <Text style={styles.paymentValue}>
                    {invoice.paymentMethod}
                  </Text>
                </View>
              )}
              {invoice.paymentTerms && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>PAYMENT TERMS</Text>
                  <Text style={styles.paymentValue}>
                    {invoice.paymentTerms}
                  </Text>
                </View>
              )}
              {invoice.poNumber && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>PO NUMBER</Text>
                  <Text style={styles.paymentValue}>{invoice.poNumber}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Trip Details */}
        <View style={styles.tripSection}>
          <Text style={styles.sectionTitle}>TRIP DETAILS</Text>

          <View style={styles.tripGrid}>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>DATE & TIME</Text>
              <Text style={styles.tripValue}>{invoice.trip.date}</Text>
            </View>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>SERVICE</Text>
              <Text style={styles.tripValue}>{invoice.trip.serviceName}</Text>
            </View>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>VEHICLE</Text>
              <Text style={styles.tripValue}>{invoice.trip.vehicleName}</Text>
            </View>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>PASSENGERS / LUGGAGE</Text>
              <Text style={styles.tripValue}>
                {invoice.trip.passengers} / {invoice.trip.luggage}
              </Text>
            </View>
            {invoice.trip.distanceMiles && (
              <View style={styles.tripItem}>
                <Text style={styles.tripLabel}>DISTANCE</Text>
                <Text style={styles.tripValue}>
                  {invoice.trip.distanceMiles.toFixed(1)} miles
                </Text>
              </View>
            )}
            {invoice.driverName && (
              <View style={styles.tripItem}>
                <Text style={styles.tripLabel}>DRIVER</Text>
                <Text style={styles.tripValue}>{invoice.driverName}</Text>
              </View>
            )}
          </View>

          {/* Route */}
          <View style={styles.route}>
            <View style={styles.routePoint}>
              <View style={[styles.routeMarker, styles.routeMarkerPickup]}>
                <Text style={styles.routeMarkerText}>A</Text>
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeAddress}>
                  {invoice.trip.pickupAddress}
                </Text>
              </View>
            </View>

            {hasStops &&
              invoice.trip.stops.map((stop, index) => (
                <View key={index} style={styles.routePoint}>
                  <View style={[styles.routeMarker, styles.routeMarkerStop]}>
                    <Text style={styles.routeMarkerText}>{index + 1}</Text>
                  </View>
                  <View style={styles.routeContent}>
                    <Text style={styles.routeLabel}>STOP {index + 1}</Text>
                    <Text style={styles.routeAddress}>{stop.address}</Text>
                  </View>
                </View>
              ))}

            <View style={styles.routePoint}>
              <View style={[styles.routeMarker, styles.routeMarkerDropoff]}>
                <Text style={styles.routeMarkerText}>B</Text>
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>DROPOFF</Text>
                <Text style={styles.routeAddress}>
                  {invoice.trip.dropoffAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.lineItemsSection}>
          <View style={styles.lineItemsHeader}>
            <Text style={[styles.lineItemsHeaderText, { flex: 1 }]}>
              DESCRIPTION
            </Text>
            <Text
              style={[
                styles.lineItemsHeaderText,
                { width: 80, textAlign: "right" },
              ]}
            >
              AMOUNT
            </Text>
          </View>

          {invoice.lineItems.map((item, index) => (
            <View key={index} style={styles.lineItemRow}>
              <Text style={styles.lineItemDesc}>{item.description}</Text>
              <Text style={styles.lineItemAmount}>
                {formatMoney(item.amount, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsGrid}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatMoney(invoice.subtotalCents, invoice.currency)}
              </Text>
            </View>
            {invoice.feesCents > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Fees</Text>
                <Text style={styles.totalsValue}>
                  {formatMoney(invoice.feesCents, invoice.currency)}
                </Text>
              </View>
            )}
            {invoice.taxesCents > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax</Text>
                <Text style={styles.totalsValue}>
                  {formatMoney(invoice.taxesCents, invoice.currency)}
                </Text>
              </View>
            )}
            <View style={[styles.totalsRow, styles.totalsBold]}>
              <Text style={[styles.totalsLabel, styles.totalsBoldText]}>
                Total
              </Text>
              <Text style={[styles.totalsValue, styles.totalsBoldText]}>
                {formatMoney(invoice.totalCents, invoice.currency)}
              </Text>
            </View>
            {hasTip && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Driver Tip</Text>
                <Text style={styles.totalsValue}>
                  {formatMoney(invoice.tipCents, invoice.currency)}
                </Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={[styles.totalsRow, styles.amountPaid]}>
              <Text style={[styles.totalsLabel, styles.amountPaidText]}>
                Amount Paid
              </Text>
              <Text style={[styles.totalsValue, styles.amountPaidText]}>
                {formatMoney(invoice.amountPaidCents, invoice.currency)}
              </Text>
            </View>
            {hasRefund && (
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, styles.refundText]}>
                  Refunded
                </Text>
                <Text style={[styles.totalsValue, styles.refundText]}>
                  -{formatMoney(invoice.amountRefundedCents, invoice.currency)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Paid Stamp */}
        {showPaidStamp && (
          <View style={styles.paidStampContainer}>
            <View style={styles.paidStamp}>
              <Text style={styles.paidText}>PAID</Text>
              {invoice.paidDate && (
                <Text style={styles.paidDate}>{invoice.paidDate}</Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for choosing {invoice.company.name}!
          </Text>
          <Text style={styles.footerSmall}>
            Questions? Contact us at{" "}
            {invoice.company.email || invoice.company.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
