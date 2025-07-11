import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { connectToDatabase } from "@/lib/mongodb"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.userId) {
          await db.collection("users").updateOne(
            { auth0Id: session.metadata.userId },
            {
              $set: {
                plan: "pro",
                stripeCustomerId: session.customer,
                updatedAt: new Date(),
              },
            },
          )
        }
        break

      case "customer.subscription.deleted":
        const subscription = event.data.object as Stripe.Subscription

        await db.collection("users").updateOne(
          { stripeCustomerId: subscription.customer },
          {
            $set: {
              plan: "free",
              updatedAt: new Date(),
            },
          },
        )
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
