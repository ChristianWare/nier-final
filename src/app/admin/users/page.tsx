import styles from "./AdminUsersPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import RoleCheckboxForm from "@/components/admin/RoleCheckboxForm/RoleCheckboxForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoleFilter = "ALL" | "ADMIN" | "DRIVER" | "USER";
type AppRole = "USER" | "ADMIN" | "DRIVER";

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
          roles: { has: roleFilter },
        };

  const users = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      emailVerified: true,
      createdAt: true,
    },
    take: 500,
  });

  const priority = (roles: AppRole[]) => {
    if (roles.includes("ADMIN")) return 0;
    if (roles.includes("DRIVER")) return 1;
    return 2;
  };

  const normalized = users
    .map((u) => {
      const roles = (u.roles?.length ? u.roles : ["USER"]) as AppRole[];
      return { ...u, roles };
    })
    .sort((a, b) => {
      const pa = priority(a.roles as AppRole[]);
      const pb = priority(b.roles as AppRole[]);
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
                  <Td label='Name'>{u.name ?? "—"}</Td>
                  <Td label='Email' className={styles.emailCell}>
                    {u.email}
                  </Td>
                  <Td label='Roles'>{(u.roles as AppRole[]).join(", ")}</Td>
                  <Td label='Verified'>{u.emailVerified ? "Yes" : "No"}</Td>
                  <Td label='Update roles'>
                    <RoleCheckboxForm
                      userId={u.id}
                      initialRoles={u.roles as AppRole[]}
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
            className={`tab ${isActive ? "tabActive" : ""}`}
          >
            {x.label}
          </Link>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className={`${styles.th}`}>{children}</th>;
}

function Td({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <td className={`${styles.td} ${className} cellStrong`} data-label={label}>
      {children}
    </td>
  );
}
