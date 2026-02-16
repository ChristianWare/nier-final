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

    const roles = (session.user as any)?.roles as string[] | undefined;
    const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin only" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPG, PNG, WebP, or SVG." },
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

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload to Cloudinary
    const isSvg = file.type === "image/svg+xml";
    const result = await cloudinary.uploader.upload(base64, {
      folder: `clients/${CLIENT_SLUG}/branding`,
      public_id: "company-logo",
      overwrite: true,
      // Don't transform SVGs — keep them vector. For raster, auto-optimize.
      ...(isSvg
        ? {}
        : {
            transformation: [
              {
                width: 800,
                crop: "limit",
                quality: "auto",
                format: "png",
              },
            ],
          }),
    });

    // Update CompanySettings with the new logo URL
    await db.companySettings.upsert({
      where: { id: "default" },
      update: { logoUrl: result.secure_url },
      create: { id: "default", logoUrl: result.secure_url },
    });

    // Revalidate paths that display the logo
    revalidatePath("/admin/company");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 },
    );
  }
}
