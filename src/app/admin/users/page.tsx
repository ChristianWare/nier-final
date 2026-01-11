// app/admin/users/page.tsx
import styles from "./AdminUsersPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import RoleCheckboxForm from "@/components/admin/RoleCheckboxForm/RoleCheckboxForm";

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
          OR: [
            // ✅ New multi-role field
            { roles: { has: roleFilter } },
            // ✅ Legacy single role field (so filters still work pre-backfill)
            { role: roleFilter },
          ],
        };

  const users = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      // ✅ Pull both during transition
      role: true,
      roles: true,
      emailVerified: true,
      createdAt: true,
    },
    take: 500,
  });

  // Optional: nice grouping (Admins first, then Drivers, then Users)
  const priority = (roles: string[]) => {
    if (roles.includes("ADMIN")) return 0;
    if (roles.includes("DRIVER")) return 1;
    return 2;
  };

  const normalized = users
    .map((u) => {
      const roles =
        u.roles && u.roles.length > 0 ? u.roles : ([u.role] as typeof u.roles);
      return { ...u, roles };
    })
    .sort((a, b) => {
      const pa = priority(a.roles as unknown as string[]);
      const pb = priority(b.roles as unknown as string[]);
      if (pa !== pb) return pa - pb;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
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
              <Th>Roles</Th>
              <Th>Verified</Th>
              <Th>Update roles</Th>
            </tr>
          </thead>

          <tbody>
            {normalized.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={5}>
                  <div className={styles.emptyText}>No users found.</div>
                </td>
              </tr>
            ) : (
              normalized.map((u) => (
                <tr key={u.id} className={styles.tr}>
                  <Td>{u.name ?? "—"}</Td>
                  <Td className={styles.emailCell}>{u.email}</Td>

                  <Td>{(u.roles as unknown as string[]).join(", ")}</Td>

                  <Td>{u.emailVerified ? "Yes" : "No"}</Td>

                  <Td>
                    <RoleCheckboxForm
                      userId={u.id}
                      initialRoles={
                        u.roles as unknown as Array<"USER" | "DRIVER" | "ADMIN">
                      }
                      // Optional UX: don’t allow editing roles of unverified users
                      // disabled={!u.emailVerified}
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
