import { isStripeConfigured } from "./types.js";
import { MockPaymentService } from "./mock.js";
import { StripePaymentService } from "./stripe.js";
import type { PaymentService } from "./types.js";

let instance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (instance) return instance;

  if (isStripeConfigured()) {
    instance = new StripePaymentService(process.env.STRIPE_SECRET_KEY!);
    console.log("Payment provider: Stripe");
  } else {
    instance = new MockPaymentService();
    console.log("Payment provider: Mock (set STRIPE_SECRET_KEY to enable Stripe)");
  }

  return instance;
}

export * from "./types.js";
export { authorizeMockPayment } from "./mock.js";
