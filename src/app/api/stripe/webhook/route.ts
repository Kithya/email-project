import { stripe } from "~/lib/stripe";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (error) {
    return new NextResponse("webhook error", { status: 400 });
  }

  console.log("stripe webhook:", (event as any).id, event.type);

  // new subscription created
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const subscriptionResp = await stripe.subscriptions.retrieve(
      session.subscription as string,
      { expand: ["items.data.price.product"] },
    );
    const subscription = subscriptionResp as unknown as Stripe.Subscription;

    const plan = subscription.items.data[0]?.price;
    const productId =
      typeof plan?.product === "string"
        ? plan.product
        : (plan?.product as Stripe.Product).id;

    await db.stripeSubscription.create({
      data: {
        subscriptionId: subscription.id,
        productId,
        priceId: plan!.id,
        customerId: subscription.customer as string,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        userId: session.client_reference_id!,
      },
    });

    return NextResponse.json({ message: "success" }, { status: 200 });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };

    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : (invoice.subscription?.id ?? "");

    if (!subscriptionId) {
      return new NextResponse("No subscription ID found", { status: 400 });
    }

    const subscriptionResp = await stripe.subscriptions.retrieve(
      subscriptionId,
      {
        expand: ["items.data.price.product"],
      },
    );
    const subscription = subscriptionResp as unknown as Stripe.Subscription;

    const plan = subscription.items.data[0]?.price;
    const productId =
      typeof plan?.product === "string"
        ? plan.product
        : (plan?.product as Stripe.Product).id;

    await db.stripeSubscription.update({
      where: { subscriptionId: subscription.id },
      data: {
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        productId,
        priceId: plan!.id,
      },
    });

    return NextResponse.json({ message: "success" }, { status: 200 });
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    console.log(
      "subscription updated",
      sub.id,
      sub.status,
      sub.cancel_at_period_end,
    );

    await db.stripeSubscription.update({
      where: { subscriptionId: sub.id },
      data: {
        updatedAt: new Date(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });

    return NextResponse.json({ message: "success" }, { status: 200 });
  }

  // NEW: handle immediate deletion (downgrade to Free instantly)
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    console.log("subscription deleted", sub.id);

    await db.stripeSubscription.deleteMany({
      where: { subscriptionId: sub.id },
    });

    return NextResponse.json({ message: "success" }, { status: 200 });
  }

  return NextResponse.json({ message: "success" }, { status: 200 });
}
