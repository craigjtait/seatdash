import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import QRCode from "qrcode";
import { COOKIE_NAME, createDeliveryToken, verifyDeliveryToken, verifyStaffPin } from "../lib/auth.js";
import { subscribeToOrder } from "../lib/redis.js";
import {
  advanceKitchenOrder,
  authorizeOrderPayment,
  confirmDelivery,
  createOrder,
  formatOrderResponse,
  getDeliveryOrders,
  getMenu,
  updateOrderStatus,
} from "../services/orders.js";

async function requireDeliveryAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[COOKIE_NAME];
  if (!token || !(await verifyDeliveryToken(token))) {
    reply.code(401).send({ error: "Unauthorized" });
    throw new Error("Unauthorized");
  }
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/menu", async (request, reply) => {
    const menu = await getMenu(request.server.db);
    return reply.send({ categories: menu });
  });

  app.post("/orders", async (request, reply) => {
    const schema = z.object({
      section: z.string().min(1).max(20),
      seat: z.string().min(1).max(20),
      items: z
        .array(
          z.object({
            menuItemId: z.string().uuid(),
            quantity: z.number().int().min(1).max(20),
          })
        )
        .min(1),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.flatten() });
    }

    try {
      const result = await createOrder(request.server.db, parsed.data);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create order";
      return reply.status(400).send({ error: message });
    }
  });

  app.get("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await formatOrderResponse(request.server.db, id);
    if (!order) return reply.status(404).send({ error: "Order not found" });
    return reply.send(order);
  });

  app.get("/orders/:id/qr", async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await formatOrderResponse(request.server.db, id);
    if (!order) return reply.status(404).send({ error: "Order not found" });

    const payload = JSON.stringify({
      orderId: order.id,
      confirmationCode: order.confirmationCode,
    });
    const png = await QRCode.toBuffer(payload, { width: 280, margin: 2 });
    return reply.type("image/png").send(png);
  });

  app.post("/orders/:id/authorize", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const order = await authorizeOrderPayment(request.server.db, id);
      return reply.send(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authorization failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.get("/orders/:id/stream", async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await formatOrderResponse(request.server.db, id);
    if (!order) return reply.status(404).send({ error: "Order not found" });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    reply.raw.write(`data: ${JSON.stringify(order)}\n\n`);

    const subscriber = subscribeToOrder(id, (payload) => {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    request.raw.on("close", () => {
      subscriber.unsubscribe();
      subscriber.disconnect();
    });
  });

  app.get("/config/payment", async (_request, reply) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    const configured = Boolean(stripeKey && stripeKey.startsWith("sk_"));
    return reply.send({
      provider: configured ? "stripe" : "mock",
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    });
  });

  // Delivery staff routes
  app.post("/delivery/login", async (request, reply) => {
    const schema = z.object({ pin: z.string().min(4).max(12) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid PIN" });

    if (!verifyStaffPin(parsed.data.pin)) {
      return reply.status(401).send({ error: "Invalid PIN" });
    }

    const token = await createDeliveryToken();
    reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return reply.send({ ok: true });
  });

  app.post("/delivery/logout", async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/delivery/orders", { preHandler: requireDeliveryAuth }, async (request, reply) => {
    const orders = await getDeliveryOrders(request.server.db);
    return reply.send({ orders });
  });

  app.patch("/delivery/orders/:id/status", { preHandler: requireDeliveryAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(["in_kitchen", "out_for_delivery", "delivered"]),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid status" });

    try {
      const order = await updateOrderStatus(request.server.db, id, parsed.data.status);
      return reply.send(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.post("/delivery/orders/confirm", { preHandler: requireDeliveryAuth }, async (request, reply) => {
    const schema = z.object({
      confirmationCode: z.string().min(4).max(20),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid code" });

    try {
      const order = await confirmDelivery(request.server.db, parsed.data.confirmationCode);
      return reply.send(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Confirmation failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.post("/delivery/orders/:id/advance", { preHandler: requireDeliveryAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const order = await advanceKitchenOrder(request.server.db, id);
      return reply.send(order);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Advance failed";
      return reply.status(400).send({ error: message });
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    db: import("@seatdash/db").Database;
  }
}
