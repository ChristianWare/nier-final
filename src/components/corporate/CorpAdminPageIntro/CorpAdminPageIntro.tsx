"use client";

import styles from "./CorpAdminPageIntro.module.css";
import { useSession } from "next-auth/react";

type Props = {
  companyName: string;
};

export default function CorpAdminPageIntro({ companyName }: Props) {
  const { data: session } = useSession();

  const fullName = session?.user?.name ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || "there";

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <h1 className='heading underline h2'>Welcome {firstName}!</h1>
        <p className={styles.sub}>{companyName} — Corporate Dashboard</p>
      </div>
    </section>
  );
}
