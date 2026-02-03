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

    // Get the file and vehicleUnitId from form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const vehicleUnitId = formData.get("vehicleUnitId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!vehicleUnitId) {
      return NextResponse.json(
        { error: "No vehicle ID provided" },
        { status: 400 },
      );
    }

    // Verify the vehicle exists
    const vehicle = await db.vehicleUnit.findUnique({
      where: { id: vehicleUnitId },
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
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

    // Set folder for vehicles
    const folder = `clients/${CLIENT_SLUG}/vehicles`;

    // Convert file to buffer then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      public_id: `vehicle-${vehicleUnitId}`,
      overwrite: true,
      transformation: [
        {
          width: 800,
          height: 600,
          crop: "fill",
          gravity: "auto",
          quality: "auto",
          format: "jpg",
        },
      ],
    });

    // Update vehicle's image in database
    await db.vehicleUnit.update({
      where: { id: vehicleUnitId },
      data: { image: result.secure_url },
    });

    // Revalidate relevant paths
    revalidatePath(`/admin/vehicles/${vehicleUnitId}`);
    revalidatePath("/admin/vehicles");

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Vehicle photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
