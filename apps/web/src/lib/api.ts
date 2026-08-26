const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  section: string;
  seat: string;
  status: string;
  queuePosition: number | null;
  confirmationCode: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentIntentId: string | null;
  estimatedDeliveryAt: string | null;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
}

export interface PaymentConfig {
  provider: "stripe" | "mock";
  publishableKey: string | null;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: options?.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export function getMenu() {
  return fetchApi<{ categories: MenuCategory[] }>("/menu");
}

export function getPaymentConfig() {
  return fetchApi<PaymentConfig>("/config/payment");
}

export function createOrder(data: {
  section: string;
  seat: string;
  items: { menuItemId: string; quantity: number }[];
}) {
  return fetchApi<{ order: Order; payment: { intentId: string; clientSecret: string | null; provider: string } }>(
    "/orders",
    { method: "POST", body: JSON.stringify(data) }
  );
}

export function authorizeOrder(orderId: string) {
  return fetchApi<Order>(`/orders/${orderId}/authorize`, { method: "POST" });
}

export function getOrder(orderId: string) {
  return fetchApi<Order>(`/orders/${orderId}`);
}

export function getOrderQrUrl(orderId: string) {
  return `${API_URL}/orders/${orderId}/qr`;
}

export function getOrderStreamUrl(orderId: string) {
  return `${API_URL}/orders/${orderId}/stream`;
}

export function deliveryLogin(pin: string) {
  return fetchApi<{ ok: boolean }>("/delivery/login", {
    method: "POST",
    body: JSON.stringify({ pin }),
    credentials: "include",
  });
}

export function deliveryLogout() {
  return fetchApi<{ ok: boolean }>("/delivery/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function getDeliveryOrders() {
  return fetchApi<{ orders: Order[] }>("/delivery/orders", { credentials: "include" });
}

export function updateDeliveryStatus(orderId: string, status: string) {
  return fetchApi<Order>(`/delivery/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    credentials: "include",
  });
}

export function confirmDeliveryCode(confirmationCode: string) {
  return fetchApi<Order>("/delivery/orders/confirm", {
    method: "POST",
    body: JSON.stringify({ confirmationCode }),
    credentials: "include",
  });
}

export function advanceOrder(orderId: string) {
  return fetchApi<Order>(`/delivery/orders/${orderId}/advance`, {
    method: "POST",
    credentials: "include",
  });
}

export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatStatus(status: string) {
  const labels: Record<string, string> = {
    pending_payment: "Awaiting Payment",
    queued: "In Queue",
    in_kitchen: "Preparing",
    out_for_delivery: "On the Way",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}
