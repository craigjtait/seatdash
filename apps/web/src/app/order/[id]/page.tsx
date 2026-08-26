"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import {
  getOrder,
  getOrderQrUrl,
  getOrderStreamUrl,
  formatCents,
  formatStatus,
  type Order,
} from "@/lib/api";

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    getOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.message));

    const streamUrl = getOrderStreamUrl(orderId);
    const source = new EventSource(streamUrl);

    source.onmessage = (event) => {
      try {
        setOrder(JSON.parse(event.data));
      } catch {
        // ignore parse errors
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [orderId]);

  if (error) {
    return (
      <>
        <Header subtitle="Order Tracking" />
        <div className="p-4 text-center text-red-600">{error}</div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header subtitle="Order Tracking" />
        <div className="flex items-center justify-center py-20">
          <p className="text-brand-silver">Loading order...</p>
        </div>
      </>
    );
  }

  const eta = order.estimatedDeliveryAt
    ? new Date(order.estimatedDeliveryAt)
    : null;

  return (
    <>
      <Header subtitle="Order Tracking" />
      <main className="max-w-lg mx-auto px-4 py-6 pb-12">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">Order Status</p>
          <h2 className="font-display text-2xl font-bold text-brand-blue-dark uppercase">
            {formatStatus(order.status)}
          </h2>
        </div>

        <OrderStatusStepper status={order.status} />

        {order.queuePosition && order.status === "queued" && (
          <div className="card p-4 mb-4 text-center bg-brand-blue/5">
            <p className="text-sm text-gray-600">Your position in queue</p>
            <p className="font-display text-4xl font-bold text-brand-blue">
              #{order.queuePosition}
            </p>
          </div>
        )}

        {eta && order.status !== "delivered" && (
          <div className="card p-4 mb-4 text-center">
            <p className="text-sm text-gray-600">Estimated delivery</p>
            <p className="font-display text-xl font-bold">
              {eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        )}

        <div className="card p-6 mb-4 text-center">
          <p className="text-sm text-gray-600 mb-2">Show this code to your delivery runner</p>
          <p className="font-display text-3xl font-bold tracking-widest text-brand-blue mb-4">
            {order.confirmationCode}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOrderQrUrl(order.id)}
            alt="Delivery confirmation QR code"
            className="mx-auto w-[280px] h-[280px] rounded-lg border border-brand-silver/40"
          />
        </div>

        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-2">Delivery Location</h3>
          <p>
            Section <strong>{order.section}</strong>, Seat <strong>{order.seat}</strong>
          </p>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          <ul className="space-y-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span>{formatCents(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Payment: {order.paymentStatus === "captured" ? "Charged" : "Authorized — charged on delivery"}
          </p>
        </div>
      </main>
    </>
  );
}
