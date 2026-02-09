import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings | Corporate" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CorporateSettingsPage() {
  noStore();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      role: true,
      title: true,
      phone: true,
      corporateAccount: {
        select: {
          id: true,
          name: true,
          billingEmail: true,
          billingAddress: true,
          billingCity: true,
          billingState: true,
          billingZip: true,
          billingCycle: true,
          paymentMethod: true,
          paymentTerms: true,
          discountPercent: true,
          monthlyLimitCents: true,
          status: true,
          createdAt: true,
        },
      },
      user: {
        select: { name: true, email: true },
      },
    },
  });

  if (!contact?.corporateAccount) redirect("/");

  const account = contact.corporateAccount;

  return (
    <SettingsClient
      account={{
        id: account.id,
        name: account.name,
        billingEmail: account.billingEmail,
        billingAddress: account.billingAddress ?? "",
        billingCity: account.billingCity ?? "",
        billingState: account.billingState ?? "",
        billingZip: account.billingZip ?? "",
        billingCycle: account.billingCycle,
        paymentMethod: account.paymentMethod,
        paymentTerms: account.paymentTerms,
        discountPercent: account.discountPercent
          ? Number(account.discountPercent)
          : null,
        monthlyLimitCents: account.monthlyLimitCents
          ? Number(account.monthlyLimitCents)
          : null,
        status: account.status,
        createdAt: account.createdAt.toISOString(),
      }}
      contact={{
        id: contact.id,
        role: contact.role,
        title: contact.title ?? "",
        phone: contact.phone ?? "",
        userName: contact.user?.name ?? "",
        userEmail: contact.user?.email ?? "",
      }}
    />
  );
}