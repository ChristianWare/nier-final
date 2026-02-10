"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";

/* ─────────────────────────────────────────────
   Helper: resolve the corporate account for the
   currently-authenticated user. Returns null if
   the caller isn't linked to any account.
   ───────────────────────────────────────────── */

async function getCallerAccount() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: { corporateAccountId: true, role: true },
  });

  return contact;
}

/* ─────────────────────────────────────────────
   Add Employee
   ───────────────────────────────────────────── */

export async function addEmployee(data: {
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  employeeId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await getCallerAccount();
    if (!caller) return { ok: false, error: "Not authorized." };

    if (!data.name?.trim()) return { ok: false, error: "Name is required." };

    // Check for duplicate email within the same account
    if (data.email?.trim()) {
      const existing = await db.corporatePassenger.findFirst({
        where: {
          corporateAccountId: caller.corporateAccountId,
          email: data.email.trim(),
        },
      });
      if (existing) {
        return {
          ok: false,
          error: "An employee with this email already exists.",
        };
      }
    }

    await db.corporatePassenger.create({
      data: {
        corporateAccountId: caller.corporateAccountId,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        department: data.department?.trim() || null,
        employeeId: data.employeeId?.trim() || null,
        active: true,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[addEmployee]", err);
    return { ok: false, error: "Failed to add employee." };
  }
}

/* ─────────────────────────────────────────────
   Edit Employee
   ───────────────────────────────────────────── */

export async function editEmployee(
  passengerId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    employeeId?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await getCallerAccount();
    if (!caller) return { ok: false, error: "Not authorized." };

    if (!data.name?.trim()) return { ok: false, error: "Name is required." };

    // Verify the passenger belongs to caller's account
    const passenger = await db.corporatePassenger.findUnique({
      where: { id: passengerId },
      select: { corporateAccountId: true },
    });

    if (
      !passenger ||
      passenger.corporateAccountId !== caller.corporateAccountId
    ) {
      return { ok: false, error: "Employee not found." };
    }

    // Check for duplicate email (excluding self)
    if (data.email?.trim()) {
      const existing = await db.corporatePassenger.findFirst({
        where: {
          corporateAccountId: caller.corporateAccountId,
          email: data.email.trim(),
          NOT: { id: passengerId },
        },
      });
      if (existing) {
        return {
          ok: false,
          error: "Another employee with this email already exists.",
        };
      }
    }

    await db.corporatePassenger.update({
      where: { id: passengerId },
      data: {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        department: data.department?.trim() || null,
        employeeId: data.employeeId?.trim() || null,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[editEmployee]", err);
    return { ok: false, error: "Failed to update employee." };
  }
}

/* ─────────────────────────────────────────────
   Toggle Employee Active / Inactive
   ───────────────────────────────────────────── */

export async function toggleEmployeeActive(
  passengerId: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await getCallerAccount();
    if (!caller) return { ok: false, error: "Not authorized." };

    const passenger = await db.corporatePassenger.findUnique({
      where: { id: passengerId },
      select: { corporateAccountId: true },
    });

    if (
      !passenger ||
      passenger.corporateAccountId !== caller.corporateAccountId
    ) {
      return { ok: false, error: "Employee not found." };
    }

    await db.corporatePassenger.update({
      where: { id: passengerId },
      data: { active },
    });

    return { ok: true };
  } catch (err) {
    console.error("[toggleEmployeeActive]", err);
    return { ok: false, error: "Failed to update status." };
  }
}
