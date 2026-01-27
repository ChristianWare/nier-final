"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePhone(formData: FormData) {
  const userId = formData.get("userId") as string;
  const phone = (formData.get("phone") as string)?.trim() ?? "";

  if (!userId) {
    return redirect("/dashboard/profile?err=Missing+user+ID");
  }

  // Basic phone validation (optional - you can make this stricter)
  if (phone && phone.length < 10) {
    return redirect("/dashboard/profile?err=Phone+number+is+too+short");
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { phone: phone || null },
    });

    revalidatePath("/dashboard/profile");
    return redirect("/dashboard/profile?ok=Phone+updated");
  } catch (error) {
    console.error("Failed to update phone:", error);
    return redirect("/dashboard/profile?err=Failed+to+update+phone");
  }
}
