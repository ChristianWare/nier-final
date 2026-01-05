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
    <section style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Users</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>
          Filter by role and manage roles here.
        </p>
      </header>

      <RoleTabs active={roleFilter} />

      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
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
                <td style={{ padding: "14px" }} colSpan={5}>
                  <div style={{ opacity: 0.75 }}>No users found.</div>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <Td>{u.name ?? "—"}</Td>
                  <Td style={{ opacity: 0.8 }}>{u.email}</Td>
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
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((x) => {
        const isActive = x.value === active;
        const href =
          x.value === "ALL" ? "/admin/users" : `/admin/users?role=${x.value}`;

        return (
          <Link
            key={x.value}
            href={href}
            prefetch
            style={{
              textDecoration: "none",
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.15)",
              background: isActive ? "rgba(0,0,0,0.06)" : "transparent",
              color: "inherit",
              fontSize: 13,
            }}
          >
            {x.label}
          </Link>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "12px 14px", fontSize: 12, opacity: 0.7 }}>
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <td style={{ padding: "12px 14px", ...style }}>{children}</td>;
}
