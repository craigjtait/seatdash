import crypto from "node:crypto";
import type { PaymentIntentResult, PaymentService } from "./types.js";

interface MockIntent {
  id: string;
  amountCents: number;
  status: PaymentIntentResult["status"];
  metadata: Record<string, string>;
}

const store = new Map<string, MockIntent>();

export class MockPaymentService implements PaymentService {
  readonly provider = "mock" as const;

  async createPaymentIntent(
    amountCents: number,
    metadata: Record<string, string>
  ): Promise<PaymentIntentResult> {
    const id = `pi_mock_${crypto.randomBytes(8).toString("hex")}`;
    store.set(id, {
      id,
      amountCents,
      status: "requires_payment_method",
      metadata,
    });
    return {
      id,
      clientSecret: `mock_secret_${id}`,
      status: "requires_payment_method",
      provider: "mock",
    };
  }

  async confirmPaymentIntent(id: string): Promise<PaymentIntentResult> {
    const intent = store.get(id);
    if (!intent) throw new Error("Payment intent not found");
    intent.status = "requires_capture";
    return {
      id: intent.id,
      clientSecret: `mock_secret_${id}`,
      status: intent.status,
      provider: "mock",
    };
  }

  async capturePayment(id: string): Promise<PaymentIntentResult> {
    const intent = store.get(id);
    if (!intent) throw new Error("Payment intent not found");
    intent.status = "succeeded";
    return {
      id: intent.id,
      clientSecret: `mock_secret_${id}`,
      status: intent.status,
      provider: "mock",
    };
  }

  async voidPayment(id: string): Promise<PaymentIntentResult> {
    const intent = store.get(id);
    if (!intent) throw new Error("Payment intent not found");
    intent.status = "canceled";
    return {
      id: intent.id,
      clientSecret: `mock_secret_${id}`,
      status: intent.status,
      provider: "mock",
    };
  }
}

export function authorizeMockPayment(id: string): PaymentIntentResult {
  const intent = store.get(id);
  if (!intent) throw new Error("Payment intent not found");
  intent.status = "requires_capture";
  return {
    id: intent.id,
    clientSecret: `mock_secret_${id}`,
    status: intent.status,
    provider: "mock",
  };
}
