"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { deliveryLogin } from "@/lib/api";

export default function DeliveryLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await deliveryLogin(pin);
      router.push("/delivery/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header subtitle="Delivery Staff" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-brand-blue-dark uppercase mb-2">
            Staff Login
          </h2>
          <p className="text-sm text-gray-500 mb-6">Enter your delivery PIN to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium mb-1">
                PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={12}
                placeholder="••••"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading || pin.length < 4} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Default dev PIN: 1234
          </p>
        </div>
      </main>
    </>
  );
}
