"use server";

import { db } from "@/lib/db";
import { sendCorporateInquiryConfirmationEmail } from "@/lib/corporateOnboarding";

interface InquiryInput {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  estimatedMonthlyRides: string;
  message: string;
}

export async function submitCorporateInquiry(data: InquiryInput) {
  try {
    // Basic server-side validation
    if (!data.companyName?.trim()) {
      return { success: false, error: "Company name is required." };
    }
    if (!data.contactName?.trim()) {
      return { success: false, error: "Contact name is required." };
    }
    if (!data.email?.trim() || !/\S+@\S+\.\S+/.test(data.email)) {
      return { success: false, error: "A valid email is required." };
    }
    if (!data.estimatedMonthlyRides?.trim()) {
      return {
        success: false,
        error: "Please select estimated monthly rides.",
      };
    }
    if (!data.message?.trim()) {
      return { success: false, error: "Please describe your needs." };
    }

    // Check for duplicate pending inquiry from same email
    const existingInquiry = await db.corporateInquiry.findFirst({
      where: {
        email: data.email.trim().toLowerCase(),
        status: { in: ["PENDING", "CONTACTED"] },
      },
    });

    if (existingInquiry) {
      return {
        success: false,
        error:
          "You already have a pending inquiry. Our team will be in touch soon.",
      };
    }

    // Create the inquiry
    await db.corporateInquiry.create({
      data: {
        companyName: data.companyName.trim(),
        contactName: data.contactName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        estimatedMonthlyRides: data.estimatedMonthlyRides,
        message: data.message.trim(),
        status: "PENDING",
      },
    });

    // Send confirmation email (non-blocking — don't fail the inquiry if email fails)
    try {
      await sendCorporateInquiryConfirmationEmail({
        to: data.email.trim().toLowerCase(),
        contactName: data.contactName.trim(),
        companyName: data.companyName.trim(),
        estimatedMonthlyRides: data.estimatedMonthlyRides,
      });
    } catch (emailErr) {
      console.error(
        "[CorporateInquiry] Confirmation email failed (inquiry still saved):",
        emailErr,
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to submit corporate inquiry:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again later.",
    };
  }
}
