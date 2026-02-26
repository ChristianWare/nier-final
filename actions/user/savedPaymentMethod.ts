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

// Helper type for the fields we need that aren't in generated Prisma types yet
type UserWithStripe = {
  id: string;
  name: string | null;
  email: string | null;
  stripeCustomerId: string | null;
};

type UserStripeOnly = {
  stripeCustomerId: string | null;
};

/**
 * Creates a Stripe SetupIntent for saving a card.
 * Also creates a Stripe Customer for the user if they don't have one yet.
 */
export async function createSetupIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  try {
    const { userId } = await requireUser();

    const rawUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        // stripeCustomerId will be available after migration
      },
    });

    if (!rawUser) return { error: "User not found." };

    // Cast through unknown to access stripeCustomerId added by migration
    const user = rawUser as unknown as UserWithStripe;

    const stripe = await getStripe();
    let customerId = user.stripeCustomerId;

    // Create Stripe Customer if they don't have one
    if (!customerId) {
      const customerParams: Record<string, unknown> = {
        metadata: { userId },
      };
      if (user.email) customerParams.email = user.email;
      if (user.name) customerParams.name = user.name;

      const customer = await stripe.customers.create(
        customerParams as Parameters<typeof stripe.customers.create>[0],
      );

      customerId = customer.id;

      type UpdateFn = (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => Promise<unknown>;

      await (db.user.update as unknown as UpdateFn)({
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

    const rawUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    const user = rawUser as unknown as UserStripeOnly | null;
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

    const rawUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    const user = rawUser as unknown as UserStripeOnly | null;
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
