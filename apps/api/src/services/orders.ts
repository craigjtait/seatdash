import { eq, inArray, asc, desc } from "drizzle-orm";
import type { Database } from "@seatdash/db";
import {
  menuCategories,
  menuItems,
  orders,
  orderItems,
  orderEvents,
} from "@seatdash/db";
import {
  generateConfirmationCode,
  hashConfirmationCode,
  normalizeConfirmationCode,
} from "../lib/confirmation.js";
import {
  assignQueuePosition,
  calculateEstimatedDelivery,
  publishOrderUpdate,
} from "../lib/redis.js";
import { authorizeMockPayment, getPaymentService } from "../services/payment/index.js";

export async function getMenu(db: Database) {
  const categories = await db
    .select()
    .from(menuCategories)
    .orderBy(asc(menuCategories.sortOrder));

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.available, true));

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        priceCents: i.priceCents,
        imageUrl: i.imageUrl,
      })),
  }));
}

export async function formatOrderResponse(db: Database, orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  return {
    id: order.id,
    section: order.section,
    seat: order.seat,
    status: order.status,
    queuePosition: order.queuePosition,
    confirmationCode: order.confirmationCode,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentIntentId: order.paymentIntentId,
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() ?? null,
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({
      name: i.itemName,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
  };
}

export async function createOrder(
  db: Database,
  input: {
    section: string;
    seat: string;
    items: { menuItemId: string; quantity: number }[];
  }
) {
  const menuItemIds = input.items.map((i) => i.menuItemId);
  const dbItems = await db
    .select()
    .from(menuItems)
    .where(inArray(menuItems.id, menuItemIds));

  if (dbItems.length !== menuItemIds.length) {
    throw new Error("One or more menu items are unavailable");
  }

  let totalCents = 0;
  const lineItems = input.items.map((line) => {
    const item = dbItems.find((m) => m.id === line.menuItemId)!;
    totalCents += item.priceCents * line.quantity;
    return {
      menuItemId: item.id,
      quantity: line.quantity,
      unitPriceCents: item.priceCents,
      itemName: item.name,
    };
  });

  const confirmationCode = generateConfirmationCode();
  const payment = getPaymentService();

  const paymentIntent = await payment.createPaymentIntent(totalCents, {
    section: input.section,
    seat: input.seat,
  });

  const [order] = await db
    .insert(orders)
    .values({
      section: input.section.trim(),
      seat: input.seat.trim(),
      status: "pending_payment",
      confirmationCode,
      confirmationCodeHash: hashConfirmationCode(confirmationCode),
      paymentIntentId: paymentIntent.id,
      paymentStatus: "pending",
      paymentProvider: payment.provider,
      totalCents,
    })
    .returning();

  await db.insert(orderItems).values(
    lineItems.map((li) => ({
      orderId: order.id,
      menuItemId: li.menuItemId,
      quantity: li.quantity,
      unitPriceCents: li.unitPriceCents,
      itemName: li.itemName,
    }))
  );

  await db.insert(orderEvents).values({
    orderId: order.id,
    eventType: "order_created",
    actor: "customer",
  });

  return {
    order: await formatOrderResponse(db, order.id),
    payment: {
      intentId: paymentIntent.id,
      clientSecret: paymentIntent.clientSecret,
      provider: paymentIntent.provider,
    },
  };
}

export async function authorizeOrderPayment(db: Database, orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");
  if (!order.paymentIntentId) throw new Error("No payment intent");

  const payment = getPaymentService();
  let result;

  if (payment.provider === "mock") {
    result = authorizeMockPayment(order.paymentIntentId);
  } else {
    result = await payment.confirmPaymentIntent(order.paymentIntentId);
    if (result.status !== "requires_capture" && result.status !== "succeeded") {
      throw new Error("Payment authorization failed");
    }
  }

  const queuePosition = await assignQueuePosition();
  const estimatedDeliveryAt = calculateEstimatedDelivery(queuePosition);

  await db
    .update(orders)
    .set({
      status: "queued",
      paymentStatus: "authorized",
      queuePosition,
      estimatedDeliveryAt,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await db.insert(orderEvents).values({
    orderId,
    eventType: "payment_authorized",
    actor: "system",
    metadata: { paymentIntentId: order.paymentIntentId },
  });

  const response = await formatOrderResponse(db, orderId);
  if (response) await publishOrderUpdate(orderId, response);
  return response;
}

export async function updateOrderStatus(
  db: Database,
  orderId: string,
  status: "in_kitchen" | "out_for_delivery" | "delivered" | "cancelled",
  actor = "delivery"
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");

  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderEvents).values({
    orderId,
    eventType: `status_${status}`,
    actor,
  });

  const response = await formatOrderResponse(db, orderId);
  if (response) await publishOrderUpdate(orderId, response);
  return response;
}

export async function confirmDelivery(db: Database, confirmationCode: string) {
  const normalized = normalizeConfirmationCode(confirmationCode);
  const hash = hashConfirmationCode(normalized);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.confirmationCodeHash, hash))
    .limit(1);

  if (!order) throw new Error("Invalid confirmation code");
  if (order.status === "delivered") throw new Error("Order already delivered");
  if (order.paymentStatus === "captured") throw new Error("Payment already captured");

  const payment = getPaymentService();
  if (!order.paymentIntentId) throw new Error("No payment intent");

  if (order.paymentStatus === "authorized") {
    await payment.capturePayment(order.paymentIntentId);
    await db
      .update(orders)
      .set({ paymentStatus: "captured", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
  }

  await db
    .update(orders)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    orderId: order.id,
    eventType: "delivery_confirmed",
    actor: "delivery",
    metadata: { confirmationCode: order.confirmationCode },
  });

  const response = await formatOrderResponse(db, order.id);
  if (response) await publishOrderUpdate(order.id, response);
  return response;
}

export async function getDeliveryOrders(db: Database) {
  const activeStatuses = ["queued", "in_kitchen", "out_for_delivery"] as const;
  const rows = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, [...activeStatuses]))
    .orderBy(asc(orders.queuePosition), desc(orders.createdAt));

  return Promise.all(rows.map((o) => formatOrderResponse(db, o.id))).then((r) =>
    r.filter(Boolean)
  );
}

export async function advanceKitchenOrder(db: Database, orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");

  if (order.status === "queued") {
    return updateOrderStatus(db, orderId, "in_kitchen", "kitchen");
  }
  if (order.status === "in_kitchen") {
    return updateOrderStatus(db, orderId, "out_for_delivery", "kitchen");
  }
  throw new Error("Order cannot be advanced from current status");
}
