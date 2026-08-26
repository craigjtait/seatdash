import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  }
  return redis;
}

const QUEUE_KEY = "seatdash:queue:counter";
const ORDER_CHANNEL_PREFIX = "seatdash:order:";

export async function assignQueuePosition(): Promise<number> {
  const client = getRedis();
  return client.incr(QUEUE_KEY);
}

export async function getActiveQueueCount(): Promise<number> {
  const client = getRedis();
  const val = await client.get(QUEUE_KEY);
  return val ? parseInt(val, 10) : 0;
}

export function orderChannel(orderId: string): string {
  return `${ORDER_CHANNEL_PREFIX}${orderId}`;
}

export async function publishOrderUpdate(orderId: string, payload: unknown): Promise<void> {
  const client = getRedis();
  await client.publish(orderChannel(orderId), JSON.stringify(payload));
}

export function subscribeToOrder(
  orderId: string,
  onMessage: (payload: unknown) => void
): Redis {
  const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  subscriber.subscribe(orderChannel(orderId));
  subscriber.on("message", (_channel, message) => {
    try {
      onMessage(JSON.parse(message));
    } catch {
      onMessage(message);
    }
  });
  return subscriber;
}

export function calculateEstimatedDelivery(
  queuePosition: number,
  basePrepMinutes = Number(process.env.BASE_PREP_MINUTES ?? 8),
  avgOrderMinutes = Number(process.env.AVG_ORDER_MINUTES ?? 4)
): Date {
  const minutes = basePrepMinutes + Math.max(0, queuePosition - 1) * avgOrderMinutes;
  return new Date(Date.now() + minutes * 60 * 1000);
}
