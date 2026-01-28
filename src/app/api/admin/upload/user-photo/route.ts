import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/lib/db";
import { cloudinary, CLIENT_SLUG } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const roles = (session.user as any)?.roles as string[] | undefined;
    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin only" },
        { status: 403 },
      );
    }

    // Get the file and userId from form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No user ID provided" },
        { status: 400 },
      );
    }

    // Verify the user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPG, PNG, or WebP." },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Determine folder based on user role
    const isDriver = user.roles?.includes("DRIVER");
    const folder = isDriver
      ? `clients/${CLIENT_SLUG}/drivers`
      : `clients/${CLIENT_SLUG}/users`;

    // Convert file to buffer then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      public_id: isDriver ? `driver-${userId}` : `user-${userId}`,
      overwrite: true,
      transformation: [
        {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "face",
          quality: "auto",
          format: "jpg",
        },
      ],
    });

    // Update user's image in database
    await db.user.update({
      where: { id: userId },
      data: { image: result.secure_url },
    });

    // Revalidate relevant paths
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
    if (isDriver) {
      revalidatePath("/driver-dashboard");
      revalidatePath("/driver-dashboard/profile");
    }

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Admin photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
