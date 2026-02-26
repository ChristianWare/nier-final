"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";

async function resolveSessionUserId(session: Session | null) {
  const user = session?.user as
    | { id?: string; userId?: string; email?: string }
    | undefined;

  const direct = user?.id ?? user?.userId ?? null;
  if (direct) return direct;

  const email = user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return u?.id ?? null;
}

async function requireUser() {
  const session = (await auth()) as Session | null;
  if (!session) throw new Error("Unauthorized");

  const userId = await resolveSessionUserId(session);
  if (!userId) throw new Error("Unauthorized");

  return { userId };
}

/**
 * Creates a Stripe SetupIntent for saving a card.
 * Also creates a Stripe Customer for the user if they don't have one yet.
 */
export async function createSetupIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  try {
    const { userId } = await requireUser();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) return { error: "User not found." };

    const stripe = await getStripe();
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customerParams = {
        metadata: { userId },
        ...(user.email ? { email: user.email } : {}),
        ...(user.name ? { name: user.name } : {}),
      } as Parameters<typeof stripe.customers.create>[0];

      const customer = await stripe.customers.create(customerParams);
      customerId = customer.id;

      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    if (!setupIntent.client_secret) {
      return { error: "Failed to create setup intent." };
    }

    return { clientSecret: setupIntent.client_secret };
  } catch (e) {
    console.error("[createSetupIntent]", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Detaches a saved payment method from the Stripe customer.
 */
const RemoveCardSchema = z.object({
  paymentMethodId: z.string().min(1),
});

export async function removeSavedCard(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  try {
    const { userId } = await requireUser();

    const parsed = RemoveCardSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Invalid request." };

    const { paymentMethodId } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    const customerId = user?.stripeCustomerId ?? null;
    if (!customerId) return { error: "No payment methods on file." };

    const stripe = await getStripe();

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      return { error: "Payment method not found." };
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (e) {
    console.error("[removeSavedCard]", e);
    return { error: "Failed to remove card. Please try again." };
  }
}

/**
 * Fetches all saved payment methods for the current user.
 */
export async function getSavedPaymentMethods() {
  try {
    const { userId } = await requireUser();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    const customerId = user?.stripeCustomerId ?? null;
    if (!customerId) return { methods: [], customerId: null };

    const stripe = await getStripe();
    const result = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 10,
    });

    return { methods: result.data, customerId };
  } catch (e) {
    console.error("[getSavedPaymentMethods]", e);
    return { methods: [], customerId: null };
  }
}
