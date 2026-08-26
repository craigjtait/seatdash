import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { createDb } from "@seatdash/db";
import { registerRoutes } from "./routes/index.js";

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? "0.0.0.0";

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://seatdash:seatdash@localhost:5432/seatdash";

  const app = Fastify({ logger: true });
  const db = createDb(databaseUrl);
  app.decorate("db", db);

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  await app.register(cookie);

  await registerRoutes(app);

  await app.listen({ port: PORT, host: HOST });
  console.log(`Seat Dash API listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
