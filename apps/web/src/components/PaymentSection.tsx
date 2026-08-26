"use client";

import { useState } from "react";

interface PaymentSectionProps {
  provider: "stripe" | "mock";
  publishableKey: string | null;
  onPaymentReady: () => void;
  submitting: boolean;
}

export function PaymentSection({
  provider,
  publishableKey,
  onPaymentReady,
  submitting,
}: PaymentSectionProps) {
  if (provider === "stripe" && publishableKey) {
    return (
      <StripePaymentPlaceholder
        publishableKey={publishableKey}
        onPaymentReady={onPaymentReady}
        submitting={submitting}
      />
    );
  }

  return <MockPaymentForm onPaymentReady={onPaymentReady} submitting={submitting} />;
}

function MockPaymentForm({
  onPaymentReady,
  submitting,
}: {
  onPaymentReady: () => void;
  submitting: boolean;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid =
    cardNumber.replace(/\s/g, "").length >= 15 &&
    expiry.length >= 4 &&
    cvc.length >= 3 &&
    name.trim().length >= 2;

  function handleClear() {
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setName("");
    setTouched(false);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Payment Details</h3>
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
          Demo Mode
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Stripe is not configured. Using a simulated payment form for development.
        Set <code className="bg-gray-100 px-1 rounded">STRIPE_SECRET_KEY</code> and{" "}
        <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to
        enable real PCI-compliant payments.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Name on Card</label>
          <input
            type="text"
            autoComplete="cc-name"
            placeholder="Jane Fan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Card Number</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className="input-field font-mono"
            maxLength={19}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Expiry</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              className="input-field font-mono"
              maxLength={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CVC</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="input-field font-mono"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {touched && !isValid && (
        <p className="text-red-600 text-sm mt-3">Please complete all payment fields.</p>
      )}

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={handleClear} className="btn-secondary flex-1">
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            if (isValid) onPaymentReady();
          }}
          disabled={submitting}
          className="btn-primary flex-1"
        >
          {submitting ? "Authorizing..." : "Authorize Payment"}
        </button>
      </div>
    </div>
  );
}

function StripePaymentPlaceholder({
  publishableKey,
  onPaymentReady,
  submitting,
}: {
  publishableKey: string;
  onPaymentReady: () => void;
  submitting: boolean;
}) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-4">Payment Details</h3>
      <p className="text-sm text-gray-600 mb-4">
        Stripe is configured. Mount Stripe Elements here using publishable key{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">{publishableKey.slice(0, 12)}…</code>
      </p>
      <button onClick={onPaymentReady} disabled={submitting} className="btn-primary w-full">
        {submitting ? "Processing..." : "Pay with Stripe"}
      </button>
    </div>
  );
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
