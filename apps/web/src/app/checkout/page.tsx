"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { CartProvider, useCart } from "@/components/CartContext";
import { PaymentSection } from "@/components/PaymentSection";
import {
  createOrder,
  authorizeOrder,
  formatCents,
  getPaymentConfig,
  type PaymentConfig,
} from "@/lib/api";
import Link from "next/link";

function CheckoutContent() {
  const router = useRouter();
  const { items, totalCents, clearCart } = useCart();
  const [section, setSection] = useState("");
  const [seat, setSeat] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPaymentConfig().then(setPaymentConfig).catch(console.error);
  }, []);

  useEffect(() => {
    if (items.length === 0 && !orderId) {
      router.replace("/");
    }
  }, [items.length, orderId, router]);

  async function handleCreateOrder() {
    if (!section.trim() || !seat.trim()) {
      setError("Please enter your section and seat number.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createOrder({
        section: section.trim(),
        seat: seat.trim(),
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      setOrderId(result.order.id);
      setPaymentReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentComplete() {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      await authorizeOrder(orderId);
      clearCart();
      router.push(`/order/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment authorization failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0 && !orderId) return null;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-12">
      <Link href="/" className="text-brand-blue text-sm mb-4 inline-block">
        ← Back to menu
      </Link>

      <h2 className="font-display text-2xl font-bold text-brand-blue-dark uppercase mb-6">
        Checkout
      </h2>

      <div className="card p-4 mb-6">
        <h3 className="font-semibold mb-3">Your Order</h3>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.menuItemId} className="flex justify-between text-sm">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>{formatCents(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-brand-blue">{formatCents(totalCents)}</span>
        </div>
      </div>

      {!paymentReady ? (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="section" className="block text-sm font-medium mb-1">
                Section
              </label>
              <input
                id="section"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 124"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="seat" className="block text-sm font-medium mb-1">
                Seat
              </label>
              <input
                id="seat"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 8"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleCreateOrder}
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? "Creating order..." : "Continue to Payment"}
          </button>
        </>
      ) : (
        <>
          <div className="card p-4 mb-4 bg-brand-blue/5">
            <p className="text-sm">
              Delivering to <strong>Section {section}, Seat {seat}</strong>
            </p>
          </div>

          <PaymentSection
            provider={paymentConfig?.provider ?? "mock"}
            publishableKey={paymentConfig?.publishableKey ?? null}
            onPaymentReady={handlePaymentComplete}
            submitting={submitting}
          />

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <p className="text-xs text-gray-500 mt-4 text-center">
            Payment is authorized now and charged only after delivery confirmation.
          </p>
        </>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <CartProvider>
      <Header subtitle="Checkout" />
      <CheckoutContent />
    </CartProvider>
  );
}
