import styles from "./CorporateInquiryDetailPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import InquiryActionsClient from "./InquiryActionsClient";
import DeleteInquiryDangerZoneClient from "./DeleteInquiryDangerZoneClient";
import { getCompanySettings } from "../../../../../../actions/admin/companySettings";
import { formatDateTime } from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusBadgeTone(status: string) {
  if (status === "PENDING") return "warn";
  if (status === "CONTACTED") return "accent";
  if (status === "APPROVED") return "good";
  if (status === "DECLINED") return "bad";
  return "neutral";
}

export default async function CorporateInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { timezone: companyTz } = await getCompanySettings();

  const inquiry = await db.corporateInquiry.findUnique({
    where: { id },
    include: {
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  if (!inquiry) return notFound();

  return (
    <section className={styles.container}>
      <Link href='/admin/corporate/inquiries' className='backBtn'>
        ← Back to Inquiries
      </Link>

      <header className={styles.header}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>{inquiry.companyName}</h1>
        </div>
        <div className={styles.headerMeta}>
          <span className={`badge badge_${statusBadgeTone(inquiry.status)}`}>
            {inquiry.status}
          </span>
          <span className={styles.meta}>
            Submitted {formatDateTime(inquiry.createdAt, companyTz)}{" "}
          </span>
        </div>
      </header>

      {/* Approved → link to account */}
      {inquiry.status === "APPROVED" && inquiry.corporateAccountId && (
        <div className={styles.approvedBanner}>
          <span>✅ Account created from this inquiry.</span>
          <Link
            href={`/admin/corporate/${inquiry.corporateAccountId}`}
            className='goodBtn'
          >
            View Account →
          </Link>
        </div>
      )}

      {/* Contact Info */}
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <div className='cardTitle h4'>Contact Information</div>
        </div>
        <div className={styles.kvGrid}>
          <KeyVal k='Contact Name' v={inquiry.contactName} />
          <KeyVal k='Email' v={inquiry.email} />
          <KeyVal k='Phone' v={inquiry.phone || "—"} />
          <KeyVal
            k='Est. Monthly Rides'
            v={inquiry.estimatedMonthlyRides || "—"}
          />
        </div>
      </div>

      {/* Message */}
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <div className='cardTitle h4'>Message</div>
        </div>
        <p className={styles.messageBody}>
          {inquiry.message || "No message provided."}
        </p>
      </div>

      {/* Review info if reviewed */}
      {inquiry.reviewedAt && (
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className='cardTitle h4'>Review History</div>
          </div>
          <div className={styles.kvGrid}>
            <KeyVal
              k='Reviewed By'
              v={inquiry.reviewedBy?.name || inquiry.reviewedBy?.email || "—"}
            />
            <KeyVal
              k='Reviewed At'
              v={formatDateTime(inquiry.reviewedAt, companyTz)}
            />{" "}
          </div>
        </div>
      )}

      {/* Actions (client component) */}
      <InquiryActionsClient
        inquiryId={inquiry.id}
        currentStatus={inquiry.status}
        currentNotes={inquiry.adminNotes || ""}
      />

      {/* Danger Zone */}
      <DeleteInquiryDangerZoneClient inquiryId={inquiry.id} />
    </section>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className='emptyTitle'>{k}</div>
      <p className='subheading'>{v}</p>
    </div>
  );
}
