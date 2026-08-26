export interface PaymentIntentResult {
  id: string;
  clientSecret: string | null;
  status: "requires_payment_method" | "requires_confirmation" | "requires_capture" | "succeeded" | "canceled";
  provider: "stripe" | "mock";
}

export interface PaymentService {
  readonly provider: "stripe" | "mock";
  createPaymentIntent(amountCents: number, metadata: Record<string, string>): Promise<PaymentIntentResult>;
  confirmPaymentIntent(id: string): Promise<PaymentIntentResult>;
  capturePayment(id: string): Promise<PaymentIntentResult>;
  voidPayment(id: string): Promise<PaymentIntentResult>;
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return Boolean(key && key.startsWith("sk_"));
}
