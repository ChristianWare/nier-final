"use server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function adminCreateSetupIntentForUser({
  userId,
}: {
  userId: string;
}): Promise<{ clientSecret: string } | { error: string }> {
  if (!userId) return { error: "Missing userId" };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      stripeCustomerId: true,
    },
  });

  if (!user) return { error: "User not found" };

  const stripe = await getStripe();
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customerParams = {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
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
    usage: "off_session",
    metadata: { userId, addedByAdmin: "true" },
  });

  if (!setupIntent.client_secret) {
    return { error: "No client secret returned by Stripe" };
  }

  return { clientSecret: setupIntent.client_secret };
}

export async function adminRemoveCardForUser({
  userId,
  paymentMethodId,
}: {
  userId: string;
  paymentMethodId: string;
}): Promise<{ success: true } | { error: string }> {
  if (!userId || !paymentMethodId) return { error: "Missing required fields" };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  const customerId = user?.stripeCustomerId ?? null;
  if (!customerId) return { error: "User has no Stripe customer" };

  const stripe = await getStripe();

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) {
    return { error: "Payment method does not belong to this user" };
  }

  await stripe.paymentMethods.detach(paymentMethodId);

  return { success: true };
}
