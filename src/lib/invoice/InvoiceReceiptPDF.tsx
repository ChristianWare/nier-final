/* eslint-disable @typescript-eslint/no-unused-vars */
// src/lib/invoice/InvoiceReceiptPDF.tsx
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "./types";
import { pdfStyles as s } from "./InvoicePDF.styles";

export type InvoiceReceiptPDFData = {
  invoiceNumber: string;
  invoiceDate: string; // formatted display string
  paidDate: string | null; // formatted display string
  status: string; // "PAID" | "PARTIALLY_PAID" | ...
  company: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmountCents: number;
  }>;
  subtotalCents: number;
  tipCents: number;
  amountPaidCents: number;
  currency: string;
  memo?: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === "PAID" ? s.statusPaid : s.statusSent;
  const label = status === "PARTIALLY_PAID" ? "PARTIAL" : status;
  return <Text style={[s.statusBadge, tone]}>{label}</Text>;
}

export default function InvoiceReceiptPDF({
  data,
}: {
  data: InvoiceReceiptPDFData;
}) {
  const hasTip = data.tipCents > 0;
  const showPaidStamp = data.status === "PAID" || !!data.paidDate;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.logoSection}>
            <View style={s.logoFallbackRow}>
              <Text style={s.companyName}>{data.company.name}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              {data.company.address ? (
                <Text style={s.companyDetails}>{data.company.address}</Text>
              ) : null}
              {data.company.city ? (
                <Text style={s.companyDetails}>{data.company.city}</Text>
              ) : null}
              {data.company.phone ? (
                <Text style={s.companyDetails}>{data.company.phone}</Text>
              ) : null}
              {data.company.email ? (
                <Text style={s.companyDetails}>{data.company.email}</Text>
              ) : null}
            </View>
          </View>

          <View style={s.invoiceInfoCol}>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice #</Text>
              <Text style={s.metaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{data.invoiceDate}</Text>
            </View>
            {data.paidDate ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Paid</Text>
                <Text style={s.metaValue}>{data.paidDate}</Text>
              </View>
            ) : null}
            <View style={[s.metaRow, { marginTop: 4 }]}>
              <Text style={s.metaLabel}>{""}</Text>
              <View style={s.metaBadgeWrap}>
                <StatusBadge status={data.status} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Bill To ── */}
        <View style={s.billToSection}>
          <Text style={s.sectionLabel}>BILL TO</Text>
          <Text style={s.customerName}>{data.customer.name}</Text>
          {data.customer.email ? (
            <Text style={s.customerDetail}>{data.customer.email}</Text>
          ) : null}
          {data.customer.phone ? (
            <Text style={s.customerDetail}>{data.customer.phone}</Text>
          ) : null}
        </View>

        {/* ── Line items ── */}
        <View style={s.lineItemsSection}>
          <View style={s.lineItemsHeader}>
            <Text style={s.lineItemsHeaderDesc}>DESCRIPTION</Text>
            <Text style={s.lineItemsHeaderAmount}>AMOUNT</Text>
          </View>
          {data.lineItems.map((item, i) => (
            <View key={i} style={s.lineItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.lineItemDesc}>{item.description}</Text>
                {item.quantity > 1 ? (
                  <Text style={{ fontSize: 8, color: "#888", marginTop: 2 }}>
                    {item.quantity} × {formatMoney(item.unitAmountCents, data.currency)}
                  </Text>
                ) : null}
              </View>
              <Text style={s.lineItemAmount}>
                {formatMoney(item.quantity * item.unitAmountCents, data.currency)}
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
                {formatMoney(data.subtotalCents, data.currency)}
              </Text>
            </View>
            {hasTip ? (
              <View style={s.totalsRow}>
                <Text style={s.tipLabel}>Tip</Text>
                <Text style={s.tipValue}>
                  {formatMoney(data.tipCents, data.currency)}
                </Text>
              </View>
            ) : null}
            <View style={s.totalsBoldRow}>
              <Text style={s.totalsBoldLabel}>Total</Text>
              <Text style={s.totalsBoldValue}>
                {formatMoney(data.subtotalCents + data.tipCents, data.currency)}
              </Text>
            </View>
            <View style={s.divider} />
            <View style={s.amountPaidRow}>
              <Text style={s.amountPaidLabel}>Amount Paid</Text>
              <Text style={s.amountPaidValue}>
                {formatMoney(data.amountPaidCents, data.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Memo ── */}
        {data.memo ? (
          <View style={s.billToSection}>
            <Text style={s.sectionLabel}>NOTE</Text>
            <Text style={s.customerDetail}>{data.memo}</Text>
          </View>
        ) : null}

        {/* ── Paid stamp ── */}
        {showPaidStamp ? (
          <View style={s.paidStampContainer}>
            <View style={s.paidStamp}>
              <Text style={s.paidStampText}>PAID</Text>
              {data.paidDate ? (
                <Text style={s.paidStampDate}>{data.paidDate}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Thank you for choosing {data.company.name}!
          </Text>
          <Text style={s.footerSmall}>
            Questions? Contact us at{" "}
            {data.company.email || data.company.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
}