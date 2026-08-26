FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace=@seatdash/api --workspace=@seatdash/db --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @seatdash/db
RUN npm run build -w @seatdash/api

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api ./apps/api
COPY package.json ./

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["sh", "-c", "cd /app/packages/db && node dist/migrate.js && node dist/seed.js && cd /app/apps/api && node dist/index.js"]
