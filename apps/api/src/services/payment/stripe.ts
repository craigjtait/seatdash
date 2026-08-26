import Stripe from "stripe";
import type { PaymentIntentResult, PaymentService } from "./types.js";

function mapStripeStatus(status: Stripe.PaymentIntent.Status): PaymentIntentResult["status"] {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_capture":
    case "succeeded":
    case "canceled":
      return status;
    default:
      return "requires_payment_method";
  }
}

export class StripePaymentService implements PaymentService {
  readonly provider = "stripe" as const;
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createPaymentIntent(
    amountCents: number,
    metadata: Record<string, string>
  ): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata,
    });
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      status: mapStripeStatus(intent.status),
      provider: "stripe",
    };
  }

  async confirmPaymentIntent(id: string): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.retrieve(id);
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      status: mapStripeStatus(intent.status),
      provider: "stripe",
    };
  }

  async capturePayment(id: string): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.capture(id);
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      status: mapStripeStatus(intent.status),
      provider: "stripe",
    };
  }

  async voidPayment(id: string): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.cancel(id);
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      status: mapStripeStatus(intent.status),
      provider: "stripe",
    };
  }
}
