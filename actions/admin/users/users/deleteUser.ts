"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteUser(userId: string) {
  try {
    if (!userId || typeof userId !== "string") {
      return { ok: false, error: "Invalid user ID" };
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        roles: true,
        _count: {
          select: {
            bookings: true,
            driverAssignments: true,
          },
        },
      },
    });

    if (!user) {
      return { ok: false, error: "User not found" };
    }

    // Prevent deleting users with active bookings or assignments
    // You can adjust this logic based on your business rules
    if (user._count.bookings > 0) {
      return {
        ok: false,
        error: `Cannot delete user with ${user._count.bookings} booking(s). Please reassign or delete their bookings first.`,
      };
    }

    if (user._count.driverAssignments > 0) {
      return {
        ok: false,
        error: `Cannot delete driver with ${user._count.driverAssignments} assignment(s). Please reassign their trips first.`,
      };
    }

    // Delete the user (cascades will handle related records like accounts, sessions)
    await db.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");

    return { ok: true };
  } catch (error) {
    console.error("deleteUser error:", error);
    return { ok: false, error: "Failed to delete user. Please try again." };
  }
}
