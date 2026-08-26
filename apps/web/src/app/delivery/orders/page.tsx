"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import {
  getDeliveryOrders,
  formatCents,
  formatStatus,
  deliveryLogout,
  type Order,
} from "@/lib/api";

export default function DeliveryOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function loadOrders() {
    getDeliveryOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => {
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          router.replace("/delivery");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleLogout() {
    await deliveryLogout();
    router.push("/delivery");
  }

  return (
    <>
      <Header subtitle="Delivery Queue" />
      <main className="max-w-lg mx-auto px-4 py-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{orders.length} active orders</p>
          <button onClick={handleLogout} className="text-sm text-brand-blue">
            Sign Out
          </button>
        </div>

        {loading && <p className="text-center text-brand-silver py-8">Loading orders...</p>}
        {error && <p className="text-red-600 text-center">{error}</p>}

        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/delivery/orders/${order.id}`} className="block card p-4 hover:border-brand-blue/40 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-display text-lg font-bold">
                    Sec {order.section} · Seat {order.seat}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </p>
                </div>
                <span className="text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-1 rounded">
                  {formatStatus(order.status)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="font-mono text-gray-600">{order.confirmationCode}</span>
                <span className="font-semibold">{formatCents(order.totalCents)}</span>
              </div>
            </Link>
          ))}
        </div>

        {!loading && orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No active orders</p>
          </div>
        )}
      </main>
    </>
  );
}
