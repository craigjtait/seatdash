"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  getDeliveryOrders,
  updateDeliveryStatus,
  confirmDeliveryCode,
  advanceOrder,
  formatCents,
  formatStatus,
  type Order,
} from "@/lib/api";

export default function DeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    getDeliveryOrders()
      .then((data) => {
        const found = data.orders.find((o) => o.id === orderId);
        if (found) setOrder(found);
        else router.replace("/delivery/orders");
      })
      .catch(() => router.replace("/delivery"));
  }, [orderId, router]);

  async function handleAdvance() {
    if (!orderId) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await advanceOrder(orderId);
      setOrder(updated);
      setMessage({ type: "success", text: "Order status updated" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkDelivered() {
    if (!orderId) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await updateDeliveryStatus(orderId, "delivered");
      setOrder(updated);
      setMessage({ type: "success", text: "Marked as delivered (payment not captured — use confirm code)" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmCode.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await confirmDeliveryCode(confirmCode.trim());
      setOrder(updated);
      setMessage({ type: "success", text: "Delivery confirmed — payment captured!" });
      setConfirmCode("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Invalid code" });
    } finally {
      setLoading(false);
    }
  }

  if (!order) {
    return (
      <>
        <Header subtitle="Order Detail" />
        <div className="flex items-center justify-center py-20">
          <p className="text-brand-silver">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header subtitle="Order Detail" />
      <main className="max-w-lg mx-auto px-4 py-4 pb-12">
        <Link href="/delivery/orders" className="text-brand-blue text-sm mb-4 inline-block">
          ← Back to queue
        </Link>

        <div className="card p-4 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-display text-2xl font-bold">
                Section {order.section}
              </h2>
              <p className="text-lg">Seat {order.seat}</p>
            </div>
            <span className="text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-1 rounded">
              {formatStatus(order.status)}
            </span>
          </div>

          {order.queuePosition && (
            <p className="text-sm text-gray-500">Queue position: #{order.queuePosition}</p>
          )}
        </div>

        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-2">Items</h3>
          <ul className="space-y-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>{item.quantity}× {item.name}</span>
                <span>{formatCents(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
        </div>

        <div className="card p-4 mb-4 bg-brand-blue/5">
          <p className="text-sm text-gray-600">Customer confirmation code</p>
          <p className="font-display text-2xl font-bold tracking-widest text-brand-blue">
            {order.confirmationCode}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {order.status === "queued" && (
            <button onClick={handleAdvance} disabled={loading} className="btn-primary w-full">
              Start Preparing (Send to Kitchen)
            </button>
          )}
          {order.status === "in_kitchen" && (
            <button onClick={handleAdvance} disabled={loading} className="btn-primary w-full">
              Mark Out for Delivery
            </button>
          )}
          {order.status === "out_for_delivery" && (
            <button onClick={handleMarkDelivered} disabled={loading} className="btn-secondary w-full">
              Mark Delivered
            </button>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Confirm Delivery & Capture Payment</h3>
          <p className="text-sm text-gray-500 mb-3">
            Scan the customer&apos;s QR code or enter their confirmation code to capture payment.
          </p>
          <form onSubmit={handleConfirmCode} className="flex gap-2">
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="input-field flex-1 font-mono tracking-wider uppercase"
            />
            <button type="submit" disabled={loading || !confirmCode.trim()} className="btn-primary px-4">
              Confirm
            </button>
          </form>
        </div>

        {message && (
          <p
            className={`mt-4 text-sm text-center ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </main>
    </>
  );
}
