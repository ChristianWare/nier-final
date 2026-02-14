/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./ProfilePage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardProfile from "@/components/Dashboard/DashboardProfile/DashboardProfile";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUserId(session: any) {
  const sessionUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export default async function DashboardProfilePage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/profile");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/profile");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      emailVerified: true,
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) redirect("/login?next=/dashboard/profile");

  const hasPassword = Boolean(user.password);

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        <DashboardProfile
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            emailVerified: user.emailVerified?.toISOString() ?? null,
            hasPassword,
          }}
        />
      </section>
    </DirtyFormProvider>
  );
}
