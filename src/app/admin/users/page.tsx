import styles from "./AdminUsersPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import RoleSelectForm from "@/components/admin/RoleSelectForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoleFilter = "ALL" | "ADMIN" | "DRIVER" | "USER";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: RoleFilter }>;
}) {
  const sp = await searchParams;
  const roleFilter: RoleFilter = sp.role ?? "ALL";

  const where =
    roleFilter === "ALL"
      ? {}
      : {
          role: roleFilter,
        };

  const users = await db.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    take: 500,
  });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Users</h1>
        <p className={styles.subcopy}>Filter by role and manage roles here.</p>
      </header>

      <RoleTabs active={roleFilter} />

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Verified</Th>
              <Th>Change role</Th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={5}>
                  <div className={styles.emptyText}>No users found.</div>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={styles.tr}>
                  <Td>{u.name ?? "—"}</Td>
                  <Td className={styles.emailCell}>{u.email}</Td>
                  <Td>{u.role}</Td>
                  <Td>{u.emailVerified ? "Yes" : "No"}</Td>
                  <Td>
                    <RoleSelectForm
                      userId={u.id}
                      currentRole={u.role as "USER" | "DRIVER" | "ADMIN"}
                    />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoleTabs({ active }: { active: RoleFilter }) {
  const items: { label: string; value: RoleFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Admins", value: "ADMIN" },
    { label: "Drivers", value: "DRIVER" },
    { label: "Users", value: "USER" },
  ];

  return (
    <div className={styles.tabs}>
      {items.map((x) => {
        const isActive = x.value === active;
        const href =
          x.value === "ALL" ? "/admin/users" : `/admin/users?role=${x.value}`;

        return (
          <Link
            key={x.value}
            href={href}
            prefetch
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
          >
            {x.label}
          </Link>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className={styles.th}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`${styles.td} ${className}`}>{children}</td>;
}
