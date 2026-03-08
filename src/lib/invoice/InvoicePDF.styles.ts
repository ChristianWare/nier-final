// src/lib/invoice/InvoicePDF.styles.ts
import { StyleSheet } from "@react-pdf/renderer";

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

export const pdfStyles = StyleSheet.create({
  // ── Page ──
  page: {
    fontFamily: FONT,
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#f0f0f0",
  },
  logoSection: {
    flexDirection: "column",
    alignItems: "flex-start",
    maxWidth: "55%",
  },
  logoImageWrap: {
    marginBottom: 8,
  },
  logoImage: {
    maxWidth: 120,
    maxHeight: 36,
    objectFit: "contain",
  },
  logoFallbackRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  logoBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  logoBox: {
    width: 28,
    height: 28,
    backgroundColor: "#000000",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoBoxLetter: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: FONT_BOLD,
  },
  companyName: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
  },
  companyDetails: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.5,
  },

  // ── Invoice info (right side of header) ──
  invoiceInfoCol: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: FONT_BOLD,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 9,
    color: "#888888",
    width: 60,
    textAlign: "right",
  },
  metaValue: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    width: 100,
    textAlign: "right",
  },
  metaBadgeWrap: {
    width: 100,
    alignItems: "flex-end",
  },

  // ── Status badge ──
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: FONT_BOLD,
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

  // ── Bill To ──
  billToSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: "#888888",
    letterSpacing: 1,
    marginBottom: 6,
  },
  customerName: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    marginBottom: 3,
  },
  customerDetail: {
    fontSize: 10,
    color: "#333333",
    marginBottom: 2,
  },

  // ── Payment Method ──
  paymentMethodSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  paymentMethodLabel: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: "#888888",
    letterSpacing: 1,
    marginRight: 10,
  },
  paymentMethodValue: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: "#1e293b",
  },

  // ── Corporate payment info ──
  corporatePaymentSection: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  corporatePaymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  corporatePaymentItem: {
    width: "33%",
    marginBottom: 4,
  },
  corporatePaymentItemLabel: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: "#888888",
    marginBottom: 2,
  },
  corporatePaymentItemValue: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: "#222222",
  },

  // ── Trip section ──
  tripSection: {
    backgroundColor: "#fafafa",
    padding: 14,
    marginBottom: 22,
    borderRadius: 4,
  },
  tripGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  tripItem: {
    width: "50%",
    marginBottom: 10,
  },
  tripItemLabel: {
    fontSize: 7,
    color: "#888888",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tripItemValue: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
  },

  // ── Route ──
  route: {
    marginTop: 6,
  },
  routePoint: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  routeMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
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
  routeMarkerText: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: "#ffffff",
  },
  routeContent: {
    flex: 1,
  },
  routePointLabel: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: "#888888",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routePointAddress: {
    fontSize: 9,
    color: "#222222",
  },

  // ── Line items ──
  lineItemsSection: {
    marginBottom: 22,
  },
  lineItemsHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#eeeeee",
    paddingBottom: 6,
    marginBottom: 6,
  },
  lineItemsHeaderDesc: {
    flex: 1,
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: "#888888",
    letterSpacing: 0.5,
  },
  lineItemsHeaderAmount: {
    width: 80,
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: "#888888",
    textAlign: "right",
    letterSpacing: 0.5,
  },
  lineItemRow: {
    flexDirection: "row",
    paddingVertical: 7,
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

  // ── Totals ──
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  totalsGrid: {
    width: 210,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: "#333333",
  },
  totalsValue: {
    fontSize: 10,
    textAlign: "right",
    color: "#333333",
  },
  totalsBoldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    marginTop: 2,
  },
  totalsBoldLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
  },
  totalsBoldValue: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#eeeeee",
    marginVertical: 4,
  },
  amountPaidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 2,
  },
  amountPaidLabel: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    color: "#22c55e",
  },
  amountPaidValue: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    color: "#22c55e",
    textAlign: "right",
  },
  refundLabel: {
    fontSize: 10,
    color: "#ef4444",
  },
  refundValue: {
    fontSize: 10,
    color: "#ef4444",
    textAlign: "right",
  },
  tipLabel: {
    fontSize: 10,
    color: "#6366f1",
  },
  tipValue: {
    fontSize: 10,
    color: "#6366f1",
    textAlign: "right",
  },

  // ── Paid stamp ──
  paidStampContainer: {
    position: "absolute",
    top: 195,
    right: 40,
  },
  paidStamp: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 14,
    paddingRight: 14,
    borderWidth: 2,
    borderColor: "#86efac",
    borderRadius: 4,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
  },
  paidStampText: {
    fontSize: 20,
    fontFamily: FONT_BOLD,
    color: "#22c55e",
  },
  paidStampDate: {
    fontSize: 8,
    fontFamily: FONT_BOLD,
    color: "#4ade80",
    marginTop: 1,
    textAlign: "center",
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: "#333333",
    marginBottom: 4,
    textAlign: "center",
  },
  footerSmall: {
    fontSize: 9,
    color: "#666666",
    textAlign: "center",
  },
});
