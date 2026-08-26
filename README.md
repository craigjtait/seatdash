# Seat Dash

In-seat food and beverage ordering for professional sports stadiums. Order from your seat, track delivery in real time, and confirm with a QR code.

## Architecture

Split **web** (Next.js) and **API** (Fastify) services, deployed via Docker Compose:

| Service | Port | Description |
|---------|------|-------------|
| **nginx** | 8080 | Reverse proxy — `/` → web, `/api/` → API |
| **web** | 3000 | Customer menu/checkout/tracking + delivery staff UI |
| **api** | 3001 | REST API, SSE order updates, payment abstraction |
| **postgres** | 5432 | Orders, menu, audit trail |
| **redis** | 6379 | Queue counter + realtime pub/sub |

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Open **http://localhost:8080**

- **Customer:** browse menu → checkout → track order with QR code
- **Delivery staff:** http://localhost:8080/delivery (PIN: `1234`)

## Local Development

```bash
cp .env.example .env

# Start infrastructure
docker compose up postgres redis -d

# Install dependencies
npm install

# Run migrations & seed menu
npm run db:migrate
npm run db:seed

# Start API and web (separate terminals)
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` and `CORS_ORIGIN=http://localhost:3000` in `.env` for local dev (web and API on separate ports).

## Payment (Stripe)

By default, **mock payments** are used — no Stripe account required. Card data in demo mode is simulated client-side and never sent to the server.

To enable real PCI-compliant payments:

1. Create a [Stripe](https://stripe.com) account
2. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Restart the stack

The API uses **manual capture** Payment Intents — payment is authorized at checkout and captured when the delivery person confirms the customer's code.

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Description |
|----------|-------------|
| `DELIVERY_STAFF_PIN` | PIN for delivery staff login (default: `1234`) |
| `JWT_SECRET` | Secret for staff session tokens |
| `STRIPE_SECRET_KEY` | Stripe secret key (empty = mock mode) |
| `BASE_PREP_MINUTES` | Base kitchen prep time for ETA |
| `AVG_ORDER_MINUTES` | Additional minutes per queued order |

## Branding

Detroit Lions–inspired palette: Honolulu Blue (`#0076B6`), Silver (`#B0B7BC`), Black, White.

## License

MIT
