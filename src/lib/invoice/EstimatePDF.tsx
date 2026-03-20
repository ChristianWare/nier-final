// src/lib/invoice/EstimatePDF.tsx
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { InvoiceData } from "./types";
import { formatMoney } from "./types";
import { pdfStyles as s } from "./InvoicePDF.styles";
import { StyleSheet } from "@react-pdf/renderer";

// Estimate-specific extra styles
const es = StyleSheet.create({
  estimateTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    color: "#1e40af",
  },
  disclaimerBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#78350f",
    lineHeight: 1.5,
  },
  pendingRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    marginTop: 2,
  },
  pendingLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
  },
  pendingValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    textAlign: "right" as const,
  },
});

export default function EstimatePDF({ invoice }: { invoice: InvoiceData }) {
  const hasStops = invoice.trip.stops.length > 0;

  return (
    <Document>
      <Page size='A4' style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.logoSection}>
            <View style={s.logoFallbackRow}>
              {/* <View style={s.logoBox}>
                <Text style={s.logoBoxLetter}>N</Text>
              </View> */}
              <Text style={s.companyName}>{invoice.company.name}</Text>
            </View>
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

          <View style={s.invoiceInfoCol}>
            <Text style={es.estimateTitle}>ESTIMATE</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Ref #</Text>
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
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <View style={es.disclaimerBox}>
          <Text style={es.disclaimerTitle}>
            ⚠ ESTIMATE — Not a Final Invoice
          </Text>
          <Text style={es.disclaimerText}>
            This document is a non-binding price estimate based on the
            information provided at the time of booking. The final price may
            vary based on actual trip duration, route changes, additional stops,
            or other factors. A final invoice will be issued after the trip is
            completed and payment is confirmed.
          </Text>
        </View>

        {/* ── Bill To ── */}
        <View style={s.billToSection}>
          <Text style={s.sectionLabel}>PREPARED FOR</Text>
          <Text style={s.customerName}>{invoice.customer.name}</Text>
          {invoice.customer.email ? (
            <Text style={s.customerDetail}>{invoice.customer.email}</Text>
          ) : null}
          {invoice.customer.phone ? (
            <Text style={s.customerDetail}>{invoice.customer.phone}</Text>
          ) : null}
        </View>

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
                <Text style={s.tripItemLabel}>EST. DISTANCE</Text>
                <Text style={s.tripItemValue}>
                  {invoice.trip.distanceMiles.toFixed(1)} miles
                </Text>
              </View>
            ) : null}
          </View>

          {/* Route */}
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
        </View>

        {/* ── Line items ── */}
        <View style={s.lineItemsSection}>
          <View style={s.lineItemsHeader}>
            <Text style={s.lineItemsHeaderDesc}>DESCRIPTION</Text>
            <Text style={s.lineItemsHeaderAmount}>ESTIMATED AMOUNT</Text>
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
            <View style={es.pendingRow}>
              <Text style={es.pendingLabel}>Estimated Total</Text>
              <Text style={es.pendingValue}>
                {formatMoney(invoice.totalCents, invoice.currency)}
              </Text>
            </View>
          </View>
        </View>

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
